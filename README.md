# vandyhacks-slackbot

[![Greenkeeper badge](https://badges.greenkeeper.io/VandyHacks/vandyhacks-ideas-slackbot.svg)](https://greenkeeper.io/)

## Purpose
Automate collecting ideas from the VandyHacks Slack `ideas` channel and categorize them on the Trello board.

## Functionality
1. When posting a message in the ideas Slack channel, you can type the name of the committee the idea belongs to and the idea description like this: 
```dev:: Build the VandyHacks 6 website in WebAssembly``` 
The SlackBot will then make a Trello card from the idea's description and put it in the appropriate committee card list.

2. To change an existing idea you already posted in Slack, you can edit your Slack message and put your new idea in. The SlackBot periodically checks for edited Slack messages and makes sure all the Trello cards are appropriately updated.

3. To delete your idea, you can just delete the Slack message you sent. The SlackBot will then delete the corresponding Trello card as well.

4. We have a voting feature so people can vote on ideas in Slack with ```thumbs_up``` and ```+1``` reactions. The SlackBot will make sure to detail the votes for each idea in the appropriate trello cards. You can vote on your own ideas too, but that's kind of cringey.

5. If you don't like viewing all the ideas on the Trello Board, you can view the ideas on our [web app](https://github.com/kevjin/vandyhacks-idea-website) in a more organised fashion!

## How to Use?
If you're part of VandyHacks, our SlackBot is already running. If you want to use this SlackBot for your own Slack Channel, just set the appropriate Slack/Trello token and keys, and do ```npm start``` to run the bot!
