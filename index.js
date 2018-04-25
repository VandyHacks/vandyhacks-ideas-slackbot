require('dotenv').config();
const SlackBot = require('slackbots');
const request = require("request");

//create the Slackbot
const bot = new SlackBot({
	token: process.env.SLACKBOT_TOKEN,
	name: 'Jenny'
});

//IDs of each committee list on Trello Board
const trelloListIDs = {
	"dev": "5aab5b7a6cfdf064d8dab063",
	"test": "5aab58024860cf64f1b2cab7",
	"sponsorship": "5aab5b7954bd914c03e95a0c",
	"logistics": "5aab5b755331d964fef346e3"
}
let botStarted = false;

//Bot starts
bot.on('start', function () {
	botStarted = true;
	let params = {
		icon_emoji: ":female-office-worker:"
	}
	bot.postMessageToChannel('testchannel', "Hi I'm Jenny, the Slack Bot for VandyHacks, and I will sort all your great ideas!", params);
});

//Bot recieves a new RTM notification from Slack
bot.on('message', function (data) {
	if (data.text && data.text.includes("::")) {

		if (!data.ts) {
			console.log("something broke");
			return;
		}
		postCardOnTrello(data);
	}
});

//given a notification, check if the data is in the <committee1,committee2>::<idea>
//If so, then check whether or not the commitees are valid
//If so, then post <idea> to appropriate commitee boards on trello
//Also tell the user on Trello their idea has been posted
function postCardOnTrello(data) {
	let committees = data.text.substring(0, data.text.indexOf("::")).replace(/\s+/g, '');
	console.log(committees);
	let commiteesArray = committees.split(",");
	const params = {
		icon_emoji: ":female-office-worker:",
		thread_ts: data.ts
	}
	needToReply = true;

	let options = {
		method: 'POST',
		url: 'https://api.trello.com/1/cards',
		qs: {
			name: data.text.substring(data.text.indexOf("::") + 2, data.text.length),
			desc: "Submitted by " + data.user + "\nSlack ID>>" + data.ts + "<<", //TODO need to fix User's name
			idList: trelloListIDs["test"],
			keepFromSource: 'all',
			key: process.env.TRELLO_KEY,
			token: process.env.TRELLO_TOKEN
		}
	};

	commiteesArray.forEach((commitee, i) => {
		if (commitee in trelloListIDs) {
			console.log("yay");
			options.qs.idList = trelloListIDs[commitee];
			request(options, function (error, response, body) {
				if (error) {
					bot.postMessageToChannel('testchannel', "Whoops, your idea was not posted to Trello correctly. Please ping the dev team to fix me");
					throw new Error(error);
				};
				didItWork = true;
			});
			if (needToReply) {
				bot.postMessageToChannel('testchannel', "Thanks for the idea, I will post it on the Trello Board. To update or delete this idea, please let me know in this thread", params);
				needToReply = false;
			}
		} else {
			console.log("not in trello list");
			console.log(commitee);
		}
	});

}

//check for edited messages in the ideas channel and returns them
function checkMessageUpdates() {
	if (botStarted) {
		request(getChannelMessages, function (error, response, body) {
			if (error) {
				throw new Error(error);
			};
			JSON.parse(body).messages.forEach((message, i) => {
				if (message.edited && message.text.indexOf("This message was deleted.") == -1) {
					console.log("edited message" + JSON.stringify(message));
					let trelloCard = matchSlackThreadToTrelloCard(message.ts, message.edited.ts);
					trelloCard.then(card => {
						if (card.desc.indexOf(message.edited.ts) == -1) {
							console.log(card);
							const options = {
								method: 'PUT',
								url: 'https://api.trello.com/1/cards/' + card.id,
								qs: {
									name: message.text.indexOf("::") == -1 ? message.text : message.text.substring(message.text.indexOf("::") + 2, message.text.length),
									desc: card.desc + "\nEdited Slack ID: " + message.edited.ts,
									key: process.env.TRELLO_KEY,
									token: process.env.TRELLO_TOKEN
								}
							};
							request(options, function (error, response, body) {
								if (error) throw new Error(error);
								const params = {
									icon_emoji: ":female-office-worker:",
									thread_ts: message.ts
								}
								bot.postMessageToChannel('testchannel', "Hey, I noticed you edited your idea. I also updated the corresponding trello card as well!", params);
								console.log(body);
							});
						}
					}, error => {
						console.log(error);
					});
				}
			})
		});
	}
}
//returns all the cards on trello board in an array
function getAllCardsFromTrello() {
	const options = {
		method: 'GET',
		url: 'https://api.trello.com/1/boards/5aab56b2f7eff265dc076d7c/cards',
		qs: {
			key: process.env.TRELLO_KEY,

			token: process.env.TRELLO_TOKEN
		}
	};
	return new Promise((resolve, reject) => {
		request(options, function (error, response, body) {
			if (error) reject(error);
			resolve(body);
		});
	})
}

function checkCardsToDelete() {
	request(getChannelMessages, function (error, response, body) {
		if (error) throw new Error(error);
		let allTrelloCards = getAllCardsFromTrello();
		allTrelloCards.then(JSON.parse, "JSON parsing had an error").then(allCards => {
			allCards.forEach((card, i) => {
				if (card.desc.indexOf(">>") != -1) {
					let checkCard = findCardInSlack(card.desc.substring(card.desc.indexOf(">>") + 2, card.desc.indexOf("<<") - 1), JSON.parse(body).messages);
					checkCard.then((deletedIdeaTs) => {
						console.log("delete this card" + card.desc.substring(card.desc.indexOf(">>") + 2, card.desc.indexOf("<<") - 1));

						const options = {
							method: 'DELETE',
							url: 'https://api.trello.com/1/cards/' + card.id,
							qs: {
								key: process.env.TRELLO_KEY,
								token: process.env.TRELLO_TOKEN
							}
						};

						const params = {
							icon_emoji: ":female-office-worker:",
							thread_ts: deletedIdeaTs
						}
						bot.postMessageToChannel('testchannel', "Hey, I noticed you just deleted your idea. I will also deleted the corresponding card on Trello for you. For archiving purposes, the deleted idea was: " + card.name, params);
						request(options, function (error, response, body) {
							if (error) {
								bot.postMessageToChannel('testchannel', "Hey, your idea was not deleted successfully on Trello, please contact the dev team to report this bug, thanks!", params);
							}
							console.log("Successfully deleted trello card");
						});
					}, () => console.log("didn't have to delete card"));
				}
			});
		}, error => console.log(error));
	});
}

//Helper function to find a card by TS in the slack channel
function findCardInSlack(ts, slackMessages) {
	return new Promise((resolve, reject) => {
		let counter = 0;
		slackMessages.forEach((message, i) => {
			if (message.ts.indexOf(ts) != -1 || ts.indexOf(message.ts) != -1) {
				if (message.text.indexOf("This message was deleted.") != -1) {
					resolve(message.ts);
				} else {
					counter++;
					if (counter == slackMessages.length) {
						console.log("counter" + counter);
						reject();
					}
				}
			} else {
				counter++;
				if (counter == slackMessages.length) {
					console.log("counter" + counter);
					reject();
				}
			}
		});
	});
}
//finds and returns the unique card that has the matching slack thread id
//this is where the trello card was created from
function matchSlackThreadToTrelloCard(slackTs, editedTs = 5) {
	return new Promise((resolve, reject) => {
		let allTrelloCards = getAllCardsFromTrello();
		allTrelloCards.then(JSON.parse, "JSON parsing had an error").then(allCards => {
			let counter = 0;
			allCards.forEach((card, i) => {
				if (card.desc.indexOf(slackTs) != -1 && card.desc.indexOf(editedTs) == -1) {
					console.log("win" + card.desc);
					resolve(card);
				}
				counter++;
				if (counter == allCards.length) {
					reject("No matching trello card found"); //there was no matching card to the slack thread, probably cause edit is already up to date
				}
			});
		}, error => console.log(error));
	});
}
setInterval(checkMessageUpdates, 5000);
setInterval(checkCardsToDelete, 5000);

//TODO: I also want to map threads to ideas so users can "delete this idea", "update this idea"

//Post request to create a new trello card, hardcoded fields are obv changed
const options = {
	method: 'POST',
	url: 'https://api.trello.com/1/cards',
	qs: {
		name: 'Get eaten by Sharks!',
		desc: 'submitted by Kevin Jin',
		idList: trelloListIDs["test"],
		keepFromSource: 'all',
		key: process.env.TRELLO_KEY,
		token: process.env.TRELLO_TOKEN
	}
};

//Request to get all the messages in a channel
const getChannelMessages = {
	method: 'GET',
	url: 'https://slack.com/api/channels.history',
	qs: {
		channel: 'C9S0DF3BR',
		token: process.env.SLACKBOT_TOKEN
	}
};