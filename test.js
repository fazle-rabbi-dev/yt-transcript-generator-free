const axios = require("axios");
const cheerio = require("cheerio");
const xml2js = require("xml2js");

const getTranscript = async videoId => {
	try {
		const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const response = await axios.get(videoUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113 Safari/537.36",
			},
		});
		const html = response.data;

		// Step 1: Extract player response JSON
		const $ = cheerio.load(html);
		const initialDataScript = $("script")
			.toArray()
			.map(el => $(el).html())
			.find(
				text =>
					text && text.includes("ytInitialPlayerResponse"),
			);

		const jsonStr = initialDataScript.match(
			/ytInitialPlayerResponse\s*=\s*(\{.+?\});/,
		)[1];

		const playerResponse = JSON.parse(jsonStr);

		// Step 2: Find captions URL
		const captions = playerResponse.captions;
		if (!captions) {
			console.log("No captions found for this video.");
			return;
		}

		const captionTracks =
			captions.playerCaptionsTracklistRenderer
				.captionTracks;
		const transcriptUrl = captionTracks[0].baseUrl;

		// Step 3: Fetch and parse transcript XML
		const transcriptResponse =
			await axios.get(transcriptUrl);
		const xml = transcriptResponse.data;

		const parsed = await xml2js.parseStringPromise(xml);
		const texts = parsed.transcript.text;

		const transcript = texts.map(t => t._).join(" ");
		console.log("Transcript:", transcript);
	} catch (err) {
		console.error("Error:", err.message);
	}
};

// Example usage:
const videoId = "0BDt08x-De8";
getTranscript(videoId);
