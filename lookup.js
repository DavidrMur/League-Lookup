const request = require('superagent');
const champions = require('./champions.js');
const constants = require('./constants');
const romanToDecimal = {
    I : 1,
    II: 2,
    III: 3,
    IV: 4
}

getSummonerId = async () => {
    console.log('Getting user\'s summoner id');
    let summerIdEndpoint =  `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${constants.SUMMONER_NAME}?api_key=${constants.API_KEY}`;

    try {
        let res = await request.get(summerIdEndpoint);
        return res.body.id;
    } catch (err) {
        console.log(err);
        throw new Error('Unable to get summoner ID');
    }

}

mapChampionNameToId = championName => (champions.champions[championName].id);

getUserCurrentMatch = async (userSummonerId) => {
    let gameReponseEndpoint = `https://na1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${userSummonerId}?api_key=${constants.API_KEY}`;

    try {
        var res = await request.get(gameReponseEndpoint);
        return res.body.participants;
    } catch (err) {
        console.log(err);
        throw new Error('Could not retrieve current match');
    }    
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
    const summonerRankEndpoint = `https://na1.api.riotgames.com/lol/league/v4/positions/by-summoner/${searchedSummonerId}?api_key=${constants.API_KEY}`;

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

module.exports = async function lookup(championName) {
    // Map the champion name to an id
    // [API] Fetch user's current game with spectator
    // Parse through current game data and find the corresponding champion id
        // Take the summonerId of the champion being played
    // [API] Fetch the corresponding summoner's rank -- Needs some exploring
    const userSummonerId = await getSummonerId();
    // console.log(userSummonerId);
    const championId = await mapChampionNameToId(championName);
    // console.log(championId);
    const gameResponse = await getUserCurrentMatch(userSummonerId);
    // console.log(gameResponse);
    const summonerId = await findPlayerByChampion(championId, gameResponse);
    // console.log(summonerId);
    const summonerRank = await getSummonerRank(summonerId);
    
    let promise = new Promise((resolve, reject) => {
        resolve(summonerRank);
    })
    return await promise;
};

// gameResponse('g6GAHN-TWiOOGITwpPvQ6lQcSW8n23Hz0dpDMRy-mppIlOs', findPlayerByChampion).then(() => {
//     setTimeout( () => {
//         getSummonerRank();
//     }, 1000)
// });

// try an async fucntion and using await?
