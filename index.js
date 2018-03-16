require('dotenv').config();
let SlackBot = require('slackbots');
let request = require("request");


let bot = new SlackBot({
	token: process.env.SLACKBOT_TOKEN,
	name: 'Jenny'
});

let trelloListIDs = {
	"dev":"5aab5b7a6cfdf064d8dab063",
	"test":"5aab58024860cf64f1b2cab7",
	"sponsorship":"5aab5b7954bd914c03e95a0c",
	"logistics":"5aab5b755331d964fef346e3"
}

bot.on('start', function() {
	let params = {
	icon_emoji: ":female-office-worker:"
	}
	bot.postMessageToChannel('testchannel',"Hi I'm Jenny the Slack Bot for VandyHacks and I will sort your ideas!", params);
});

bot.on('message',function(data) {
	if(data.text && data.text.includes("::")) {

		if(!data.ts) {
			console.log("something broke");
			return;
		}
		let committees = data.text.substring(0,data.text.indexOf("::")).replace(/\s+/g, '');
		console.log(committees);
		let commiteesArray = committees.split(",");

		let params = {
			icon_emoji: ":female-office-worker:",
			thread_ts: data.ts
		}
		needToReply = true;
		options.qs.name=data.text.substring(data.text.indexOf("::")+2, data.text.length);
		//TODO: Need to fix this
		options.qs.desc="Submitted by " + data.user;

		commiteesArray.forEach((commitee, i) => {
			if(commitee in trelloListIDs) {
				console.log("yay");
				options.qs.idList = trelloListIDs[commitee];
				request(options, function (error, response, body) {
				  if (error) {
				  	bot.postMessageToChannel('testchannel',"Whoops, your idea was not posted to Trello correctly. Please ping the dev team to fix me");
				  	throw new Error(error);
				  };
				  console.log(body);
				  didItWork = true;
				});
				if(needToReply) {
					bot.postMessageToChannel('testchannel', "Thanks for the idea, I will post it on the Trello Board. To update or delete this idea, please let me know in this thread", params);
					needToReply = false;
				}
			} else {
				console.log("not in trello list");
				console.log(commitee);
			}
		}); //this
	}
});

//TODO: I also want to map threads to ideas so users can "delete this idea", "update this idea"
let options = { method: 'POST',
  url: 'https://api.trello.com/1/cards',
  qs: 
   { name: 'Get eaten by Sharks!',
     desc: 'submitted by Kevin Jin',
     idList: trelloListIDs["test"],
     keepFromSource: 'all',
     key: process.env.TRELLO_KEY,
     token: process.env.TRELLO_TOKEN
  } };

