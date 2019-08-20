const request = require('superagent');
const AWS = require ('aws-sdk');
const champions = require('./champions.js');
const constants = require('./constants');
const romanToDecimal = {
    I : 1,
    II: 2,
    III: 3,
    IV: 4
}

let s3 = new AWS.S3({
    accessKeyId: constants.AWS_ACCESS_KEY,
    secretAccessKey: constants.AWS_SECRET_KEY
});

let gameType;

getSummonerName = async (userAccessToken) => {
    console.log('Getting user\'s summoner name');
    let options = {
        Bucket: constants.BUCKET_NAME,
        Key: userAccessToken
    }

    let promise = new Promise((resolve, reject) => {
        s3.getObject(options, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                let summonerName = data.Body.toString('ascii');
                summonerName = summonerName.split(":").pop();
                resolve(summonerName);
            }
          });
    })
    return await promise;
}

getSummonerId = async (summonerName) => {
    console.log('Getting user\'s summoner id');
    let summerIdEndpoint =  `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=${constants.API_KEY}`;

    let promise = new Promise((resolve, reject) => {
        request.get(summerIdEndpoint).then(res => {
            resolve(res.body.id)
        })
        .catch(err => {
            console.log(err);
        });
    })

    return await promise;

}

mapChampionNameToId = championName => (champions.champions[championName].id);

getUserCurrentMatch = async (userSummonerId) => {
    let gameReponseEndpoint = `https://na1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${userSummonerId}?api_key=${constants.API_KEY}`;

    let promise = new Promise((resolve, reject) => {

        request.get(gameReponseEndpoint).then(res => {
            gameType = res.body.gameQueueConfigId;
            gameResponse = res.body.participants;
            resolve(gameResponse);
        })
        .catch(err => {
            console.log(err);
        })
    })

    return await promise;
}

function findPlayerByChampion (championId, gameResponse){
    // Go to participants of the response object
    // Check each index to see if championId matches championId
        // If match, fetch summonerId of that same index and return it
        // If unable to find, go to next. If can't find at all, exit gracefully
    console.log('Searching based on champion...');
    let searchedSummonerId = '';

    for (let i =0; i < gameResponse.length; i++) {
        if (gameResponse[i].championId == championId) {
            searchedSummonerId = gameResponse[i].summonerId;
            return searchedSummonerId;
        }
    }

    return;
}

getSummonerRank = async (searchedSummonerId) => {
    console.log('Getting summoner rank...');
    const summonerRankEndpoint = `https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/${searchedSummonerId}?api_key=${constants.API_KEY}`;
    let rankedSelection;
    let isSelectionRanked;

    switch(gameType) {
        // TODO add support for TT and TFT game modes
        case '440':
            rankedSelection = 'RANKED_FLEX_5x5';
            break;
        case '420':    
        default:
            // For unsupported game modes, probably what people are looking for
            rankedSelection = 'RANKED_SOLO_5x5';       
    }

    let promise = new Promise((resolve, reject) => {
        request.get(summonerRankEndpoint).then(res => {
            let i = 0;
            while (res.body[i] && res.body[i].queueType !== rankedSelection) {
                i++;
            }
            if (res.body[i]) {
                isSelectionRanked = true;
                resolve(res.body[i])
            } else {
                isSelectionRanked = false;
                resolve(null);
            }
        })
        .catch(err => {
            console.log(err);
        });
    });

    let summonerRank = await promise;
    return isSelectionRanked ? (`${summonerRank.tier} ${romanToDecimal[summonerRank.rank]}`) : ('Summoner is unranked');
}

module.exports = async function lookup(championName, userAccessToken) {
    // Map the champion name to an id
    // [API] Fetch user's current game with spectator
    // Parse through current game data and find the corresponding champion id
        // Take the summonerId of the champion being played
    // [API] Fetch the corresponding summoner's rank -- Needs some exploring
    const userSummonerName = await getSummonerName(userAccessToken);
    const userSummonerId = await getSummonerId(userSummonerName);
    const championId = await mapChampionNameToId(championName);
    const gameResponse = await getUserCurrentMatch(userSummonerId);
    const summonerId = await findPlayerByChampion(championId, gameResponse);
    const summonerRank = await getSummonerRank(summonerId);
    
    let promise = new Promise((resolve, reject) => {
        resolve(summonerRank);
    })
    return await promise;
};
