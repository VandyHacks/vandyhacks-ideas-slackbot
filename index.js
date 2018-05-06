require('dotenv').config();
const request = require("request");
const express = require("express");
const trelloCalls = require('./trelloCalls.js');
const slackCalls = require('./slackCalls.js');
const SlackBot = require('slackbots');
let app = express();
let router = express.Router();
let bodyParser = require('body-parser');

const {SLACKBOT_TOKEN, TRELLO_TOKEN, TRELLO_KEY} = process.env;

let port = process.env.PORT || 8080;

app.set('port', port);

app.use('/api', router);

app.listen(port, ()=> {
  console.log("We are using port: " + port);
});

router.use(function(req, res,next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.route('/cards').get(function(req, res) {
	// console.log("TRYING TO GET CARDS" + getAllCardsFromTrello());
	// getAllCardsFromTrello().then(res.json, "there was an error in getting cards")
	let allTrelloCards = trelloCalls.getAllCardsFromTrello();
	allTrelloCards.then(JSON.parse, "JSON parsing had an error").then(allCards => {
			res.send(allCards);
	});
});

setInterval(slackCalls.checkMessageUpdates, 5000);
setInterval(slackCalls.checkCardsToDelete, 5000);
setInterval(slackCalls.updateUpvotes,5000);


const bot = new SlackBot({
	token: process.env.SLACKBOT_TOKEN,
	name: 'Justin'
});

//Bot recieves a new RTM notification from Slack
bot.on('message', function (data) {
	if (data.text && data.text.includes("::")) {
		console.log("I RECELIVED THE MESSAGE");

		if (!data.ts) {
			console.log("something broke");
			return;
		}
		slackCalls.postCardOnTrello(data);
	}
});
