require('dotenv').config();
const trelloCalls = require('./trelloCalls.js');
const SlackBot = require('slackbots');
const request = require("request");

const CHANNEL_NAME = 'testchannel';
const CHANNEL_ID = 'C9S0DF3BR';

//create the Slackbot
const bot = new SlackBot({
	token: process.env.SLACKBOT_TOKEN,
	name: 'Jenny'
});

let botStarted = false;

//Bot starts
bot.on('start', function () {
	botStarted = true;
	let params = {
		icon_emoji: ":female-office-worker:"
	}
	bot.postMessageToChannel(CHANNEL_NAME, "Hi I'm Jenny, the Slack Bot for VandyHacks, and I will sort all your great ideas!", params);
});

function getSlackBot() {
  return bot;
}

//Request to get all the messages in a channel
const getChannelMessages = {
  method: 'GET',
  url: 'https://slack.com/api/channels.history',
  qs: {
    channel: CHANNEL_ID,
    token: process.env.SLACKBOT_TOKEN
  }
};

//given a notification, check if the data is in the <committee1,committee2>::<idea>
//If so, then check whether or not the committees are valid
//If so, then post the idea to appropriate committee boards on trello
//Also reply to the user on Trello that their idea has been posted
function postCardOnTrello(data) {
	let committees = data.text.substring(0, data.text.indexOf("::")).replace(/\s+/g, '');
	console.log(committees);
	let committeesArray = committees.split(",");
	const params = {
		icon_emoji: ":female-office-worker:",
		thread_ts: data.ts
	}
	needToReply = true;

  getSlackUserFromID(data.user).then(slackName => {
    let options = trelloCalls.createTrelloCard(
      data.text.substring(data.text.indexOf("::") + 2, data.text.length),
      "Committee: "+committees.toUpperCase()+ "\n" + "Submitted by " + slackName + "\nSlack ID>>" + data.ts + "<<",  //TODO need to fix User's name
    );

    committeesArray.forEach((committee, i) => {
      let trelloListIDs = trelloCalls.getTrelloListIDs();
      if (committee in trelloListIDs) {
        console.log("yay");
        options.qs.idList = trelloListIDs[committee];
        request(options, function (error, response, body) {
          if (error) {
            bot.postMessageToChannel(CHANNEL_NAME, "Whoops, your idea was not posted to Trello correctly. Please ping the dev team to fix me");
            throw new Error(error);
          };
          didItWork = true;
        });
        if (needToReply) {
          bot.postMessageToChannel(CHANNEL_NAME, "Thanks for the idea, I will post it on the Trello Board. To update or delete this idea, please let me know in this thread", params);
          needToReply = false;
        }
      } else {
        console.log("not in trello list");
        console.log(committee);
      }
    });
  });

}

//Periodically check for deleted slack messages and delete corresponding trello CARDS
//If the corresponding trello card doesn't exist, do nothing.
function checkCardsToDelete() {
	request(getChannelMessages, function (error, response, body) {
		if (error) throw new Error(error);
		let allTrelloCards = trelloCalls.getAllCardsFromTrello();
		allTrelloCards.then(JSON.parse, "JSON parsing had an error").then(allCards => {
			allCards.forEach((card, i) => {
				if (card.desc.indexOf(">>") === -1)
					return;
				let checkCard = findCardInSlack(card.desc.substring(card.desc.indexOf(">>") + 2, card.desc.indexOf("<<")), JSON.parse(body).messages);
				checkCard.then((deletedIdeaTs) => {
					console.log("delete this card: slack ID" + card.desc.substring(card.desc.indexOf(">>") + 2, card.desc.indexOf("<<")));
          console.log("delete this card: card ID" + card.id);
					const options = trelloCalls.deleteTrelloCardReq(card.id);
					const params = {
						icon_emoji: ":female-office-worker:",
						thread_ts: deletedIdeaTs
					}
					bot.postMessageToChannel(CHANNEL_NAME, "Hey, I noticed you just deleted your idea. I will also deleted the corresponding card on Trello for you. For archiving purposes, the deleted idea was: " + card.name, params);
					request(options, function (error, response, body) {
						if (error) {
							bot.postMessageToChannel(CHANNEL_NAME, "Hey, your idea was not deleted successfully on Trello, please contact the dev team to report this bug, thanks!", params);
						}
						console.log("Successfully deleted trello card");
					});
				}, () => console.log("didn't have to delete card"));
			});
		}, error => console.log(error));
	});
}

//Periodically checks if a slack idea has been upvoted. Then updates the upvote counter on the corresponding Trello card
//TODO: Need to make a list of strings users cannot input as ideas
function updateUpvotes() {
	if (botStarted) {
		request(getChannelMessages, function (error, response, body) {
			if (error) {
				throw new Error(error);
			};
			JSON.parse(body).messages.forEach((message, i) => {
				if (message.reactions && message.text.indexOf("This message was deleted.") == -1) {
					let trelloCard = trelloCalls.matchSlackThreadToTrelloCard(message.ts, -1);
					trelloCard.then(card => {
              let editedSlackID = card.desc.indexOf("Edited Slack ID") ==-1 ? "" : "\n"+card.desc.substring(card.desc.indexOf("Edited Slack ID"), card.desc.length);
							const options = trelloCalls.updateTrelloCard(
                card.id,
                message.text.indexOf("::") == -1 ? message.text : message.text.substring(message.text.indexOf("::") + 2, message.text.length),
                card.desc.indexOf("Upvotes: ")==-1 ? card.desc.substring(0,card.desc.indexOf("<<")+2) + " Upvotes: 1" + editedSlackID : card.desc.substring(0,card.desc.indexOf("Upvotes:")) + "Upvotes: " + trelloCalls.getUpvotes(message.reactions) + editedSlackID,
              );
							request(options, function (error, response, body) {
								if (error) throw new Error(error);
								const params = {
									icon_emoji: ":female-office-worker:",
									thread_ts: message.ts
								}
							});
					}, error => {
						console.log(error);
					});
				}
			})
		});
	}
}


//Periodically check for edited messages in the ideas channel and updates the corresponding Trello Card
function checkMessageUpdates() {
	if (botStarted) {
		request(getChannelMessages, function (error, response, body) {
			if (error) {
				throw new Error(error);
			};
			JSON.parse(body).messages.forEach((message, i) => {
				if (message.edited && message.text.indexOf("This message was deleted.") == -1) {
					console.log("edited message" + JSON.stringify(message));
					let trelloCard = trelloCalls.matchSlackThreadToTrelloCard(message.ts, message.edited.ts);
					trelloCard.then(card => {
						if (card.desc.indexOf(message.edited.ts) == -1) {
							console.log(card);
							const options = trelloCalls.updateTrelloCard(
                card.id,
                message.text.indexOf("::") == -1 ? message.text : message.text.substring(message.text.indexOf("::") + 2, message.text.length),
                card.desc + "\nEdited Slack ID: " + message.edited.ts
              );
							request(options, function (error, response, body) {
								if (error) throw new Error(error);
								const params = {
									icon_emoji: ":female-office-worker:",
									thread_ts: message.ts
								}
								bot.postMessageToChannel(CHANNEL_NAME, "Hey, I noticed you edited your idea. I also updated the corresponding trello card as well!", params);
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

function getSlackUserFromID(userId) {
  const options = {
    method: 'GET',
    url: 'https://slack.com/api/users.list',
    qs: {
      token: process.env.SLACKBOT_TOKEN
    }
  };
  return new Promise((resolve, reject) => {
    request(options, function(error, response, body) {
      if(error) {
        reject(error);
      }
      let members = JSON.parse(body).members;
      for(i in members) {
        if(members[i].id==userId) {
          console.log("hello there" + members[i].real_name);
          resolve(members[i].real_name);
        }
      }
      resolve("Anonymous");
    });
  })
}

module.exports = {
  checkMessageUpdates: checkMessageUpdates,
  checkCardsToDelete: checkCardsToDelete,
  updateUpvotes: updateUpvotes,
  postCardOnTrello: postCardOnTrello,
  getSlackBot: getSlackBot
};
