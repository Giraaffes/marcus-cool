require("express-async-errors");

const express = require("express");
const server = express();


server.use((req, res, next) => {
	res.set("access-control-allow-origin", "*");
	next();
});

server.use("/test", express.static("files", {
	setHeaders: res => res.set("access-control-allow-origin", "*"),
	extensions: ["html"],
	fallthrough: false
}));


server.use((err, req, res, next) => {
	if (err.status == 404) {
		res.status(404).send("<title>404</title>404: Denne side findes ikke").end();
	} else {
		let timeStr = (new Date()).toLocaleString({timeZone: "Europe/Copenhagen"});
		console.error(timeStr, req.url, err);
	
		res.status(500).send("<title>Fejl</title>Beklager, der opstod en fejl...").end();
	}
})

server.listen(7000, "127.0.0.1", () => {
	console.log("Ready");
});