const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

/**
 * Vercel Node.js function with CORS support
 */
module.exports = async function handler(req, res) {
	// ✅ Add CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET,OPTIONS",
	);
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type",
	);

	// ✅ Handle preflight request
	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	const { videoId } = req.query;

	if (!videoId) {
		return res
			.status(400)
			.json({ error: "videoId is required" });
	}

	try {
		const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const response = await axios.get(videoUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113 Safari/537.36",
			},
		});
		const html = response.data;

		const $ = cheerio.load(html);
		const script = $("script")
			.toArray()
			.map(el => $(el).html())
			.find(
				text =>
					text && text.includes("ytInitialPlayerResponse"),
			);

		const json = script.match(
			/ytInitialPlayerResponse\s*=\s*(\{.+?\});/,
		)[1];
		const playerData = JSON.parse(json);

		const captions = playerData?.captions;
		if (!captions)
			return res
				.status(404)
				.json({ error: "No captions available" });

		const transcriptUrl =
			captions.playerCaptionsTracklistRenderer
				.captionTracks[0].baseUrl;
		const transcriptXml = await axios.get(transcriptUrl);
		const parsed = await xml2js.parseStringPromise(
			transcriptXml.data,
		);

		const transcript = parsed.transcript.text
			.map(t => t._)
			.join(" ");
		res.status(200).json({ transcript });
	} catch (err) {
		res
			.status(500)
			.json({
				error: "Failed to fetch transcript",
				detail: err.message,
			});
	}
};
