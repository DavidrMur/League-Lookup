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
                console.log(summonerName);
                resolve(summonerName);
            }          // successful response
          });
    })
    return await promise;
}

getSummonerId = async (summonerName) => {
    console.log('Getting user\'s summoner id');
    let summerIdEndpoint =  `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=${constants.API_KEY}`;

    let promise = new Promise((resolve, reject) => {
        request.get(summerIdEndpoint).then(res => {
            // userSummonerId = res.body.id;
            // resolve();
            console.log(res.body.id);
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
            //console.log(res.body);
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
            // console.log(searchedSummonerId);
        }
    }

    return;
}

getSummonerRank = async (searchedSummonerId) => {
    console.log('Getting summoner rank...');
    const summonerRankEndpoint = `https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/${searchedSummonerId}?api_key=${constants.API_KEY}`;

    let promise = new Promise((resolve, reject) => {
        request.get(summonerRankEndpoint).then(res => {
            // console.log(res.body);
            resolve(res.body[0]);
        })
        .catch(err => {
            console.log(err);
        });
    });

    let summonerRank = await promise;
    return (`Summoner Rank: ${summonerRank.tier} ${romanToDecimal[summonerRank.rank]}`);
}

module.exports = async function lookup(championName, userAccessToken) {
    // Map the champion name to an id
    // [API] Fetch user's current game with spectator
    // Parse through current game data and find the corresponding champion id
        // Take the summonerId of the champion being played
    // [API] Fetch the corresponding summoner's rank -- Needs some exploring
    const userSummonerName = await getSummonerName(userAccessToken);
    const userSummonerId = await getSummonerId(userSummonerName);
    //console.log(userSummonerId);
    const championId = await mapChampionNameToId(championName);
    // // console.log(championId);
    const gameResponse = await getUserCurrentMatch(userSummonerId);
    // // console.log(gameResponse);
    const summonerId = await findPlayerByChampion(championId, gameResponse);
    // // console.log(summonerId);
    const summonerRank = await getSummonerRank(summonerId);
    
    let promise = new Promise((resolve, reject) => {
        resolve(summonerRank);
    })
    return await promise;
};

// test = async () => {
//     let championName = 'ezreal'
//     const userSummonerName = await getSummonerName('394aea50-ace5-11e9-9211-a776bb2faed2');
//     const userSummonerId = await getSummonerId(userSummonerName);
//     //console.log(userSummonerId);
//     const championId = await mapChampionNameToId(championName);
//     // // console.log(championId);
//     const gameResponse = await getUserCurrentMatch(userSummonerId);
//     // // console.log(gameResponse);
//     const summonerId = await findPlayerByChampion(championId, gameResponse);
//     // // console.log(summonerId);
//     const summonerRank = await getSummonerRank(summonerId);
    
//     let promise = new Promise((resolve, reject) => {
//         console.log(summonerRank);
//         resolve(summonerRank);
//     })
//     return await promise;
// }

// test();