require('dotenv').config();
const bodyParser = require('body-parser')
const express = require("express");
const SlackBot = require('slackbots');
const app = express();
const router = express.Router();

const {SLACKBOT_TOKEN} = process.env;

const port = process.env.PORT || 8080;
const CHANNEL_NAME = 'testchannel';

app.set('port', port);

app.listen(port, ()=> {
    console.log("We are using port: " + port);
  });

app.use('/api', router);
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
let params = {
	icon_emoji: ":chipmunk:"
}
router.route('/:channel/loudspeaker').post(function(req, res) {
	console.log(req.body)
	let channel = req.params.channel
	bot.postMessageToChannel(channel, req.body.msg,params);
	res.status(200).send();
});

const bot = new SlackBot({
	token: SLACKBOT_TOKEN,
	name: 'Justin'
});
let botStarted = false;
bot.on('start', function () {
	botStarted = true;
});