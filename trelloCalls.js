require('dotenv').config();
const request = require("request");
const {TRELLO_TOKEN, TRELLO_KEY} = process.env;
const TRELLO_CARDS_URL = 'https://api.trello.com/1/cards/';

//IDs of each committee list on Trello Board
const trelloListIDs = {
	"dev": "5aab5b7a6cfdf064d8dab063",
	"test": "5aab58024860cf64f1b2cab7",
	"sponsorship": "5aab5b7954bd914c03e95a0c",
	"logistics": "5aab5b755331d964fef346e3",
	"communications": "5b39e3b4f132c85ddc81f0a7",
	"hackerxp": "5b39e3b7533f00499b9bdfde"
}

function getTrelloListIDs() {
  return trelloListIDs;
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

//returns all the cards on trello board in an array
function getAllCardsFromTrello() {
	const options = {
		method: 'GET',
		url: 'https://api.trello.com/1/boards/5aab56b2f7eff265dc076d7c/cards/',
		qs: {
			key: TRELLO_KEY,
			token: TRELLO_TOKEN
		}
	};
	return new Promise((resolve, reject) => {
		request(options, function (error, response, body) {
			if (error) reject(error);
			resolve(body);
		});
	})
}

function deleteTrelloCardReq(cardId) {
  return {
    method: 'DELETE',
    url: TRELLO_CARDS_URL + cardId,
    qs: {
      key: TRELLO_KEY,
      token: TRELLO_TOKEN
    }
  };
}

//helper function to count the number of upvotes from a reaction object and return
function getUpvotes(reactions) {
	let counter = 0;
	for(i in reactions) {
		if(reactions[i].name=='+1' || reactions[i].name=='thumbsup_all') {
			counter = counter + reactions[i].count;
		}
	}
	return counter;
}

function updateTrelloCard(cardId, cardName, cardDesc) {
  return {
    method: 'PUT',
    url: 'https://api.trello.com/1/cards/' + cardId,
    qs: {
      name: cardName,
      desc: cardDesc,
      key: TRELLO_KEY,
      token: TRELLO_TOKEN
    }
  };
}

function createTrelloCard(cardName, cardDesc) {
  return {
		method: 'POST',
		url: TRELLO_CARDS_URL,
		qs: {
			name: cardName,
			desc: cardDesc,
			idList: trelloListIDs["test"],
			keepFromSource: 'all',
			key: TRELLO_KEY,
			token: TRELLO_TOKEN
		}
	};
}

module.exports = {
  matchSlackThreadToTrelloCard,
  getAllCardsFromTrello,
  deleteTrelloCardReq,
  getUpvotes,
  updateTrelloCard,
  createTrelloCard,
  getTrelloListIDs
};
