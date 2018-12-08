require('dotenv').config();
const bodyParser = require('body-parser')
const express = require("express");
const SlackBot = require('slackbots');
const app = express();
const router = express.Router();
const request = require('request');
var cronJob = require('cron').CronJob;

let {SLACKBOT_TOKEN,COOKIE} = process.env;

const port = process.env.PORT || 8080;

app.set('port', port);

app.listen(port, ()=> {
    console.log("We are using port: " + port);
  });

app.use('/', router);
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.route('/').get(function(req, res) {
    console.log(`Pinged at ${new Date()}`)
    res.status(200).send();
});

const bot = new SlackBot({
    token: SLACKBOT_TOKEN,
    name: "VH AoC Leaderboards"
});

var params = {
    icon_emoji: ':vh:'
};

//Bot recieves a new RTM notification from Slack
bot.on('message', function (data) {
	if (data.text && ["!leaderboard", "!lb", "!flex"].includes(data.text.trim())) {
		console.log("sent leaderboard");

		if (!data.ts) {
			console.log("something broke");
			return;
		}
		postLeaderboard();
	}
});

let postLeaderboard = () => {
    let options = {
        url: "https://adventofcode.com/2018/leaderboard/private/view/219486.json",
        headers: {
            'Cookie':COOKIE
        }
    }
    request(options, function(error, response,body) {
        try {
            body = JSON.parse(body)
        } catch(e) {
            console.log(e)
            console.log("didnt work :(")
            return;
        }
    if (!error && response.statusCode == 200 && body) {
        let allData = Object.keys(body.members).map((playerId) => {
            let text = `${body.members[playerId].name}:\t${body.members[playerId].stars}`
            let score = body.members[playerId].stars*1000+body.members[playerId].local_score
            return {text: text, score: score}
        })
        allData.sort(function (a, b) {
            return b.score - a.score;
        });
        let message = (allData.map((e,i)=>`${i+1}) ${e.text}`)).join("\n")
        // console.log(message);
        bot.postMessageToChannel("advent-of-code",message,params)
    }
    });

}

new cronJob({
    cronTime: "5 19 * * 2",
    onTick: postLeaderboard,
    start: true,
    timeZone: "America/New_York"
});
