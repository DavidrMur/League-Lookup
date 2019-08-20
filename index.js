// Lambda Function code for Alexa.
// Paste this into your index.js file. 

const Alexa = require("ask-sdk");
const https = require("https");
const lookup = require("./lookup");


const invocationName = "league lookup";

// Session Attributes 
//   Alexa will track attributes for you, by default only during the lifespan of your session.
//   The history[] array will track previous request(s), used for contextual Help/Yes/No handling.
//   Set up DynamoDB persistence to have the skill save and reload these attributes between skill sessions.

function getMemoryAttributes() {   const memoryAttributes = {
       "history":[],


       "launchCount":0,
       "lastUseTimestamp":0,

       "lastSpeechOutput":{},
       // "nextIntent":[]

       // "favoriteColor":"",
       // "name":"",
       // "namePronounce":"",
       // "email":"",
       // "mobileNumber":"",
       // "city":"",
       // "state":"",
       // "postcode":"",
       // "birthday":"",
       // "bookmark":0,
       // "wishlist":[],
   };
   return memoryAttributes;
};

const maxHistorySize = 20; // remember only latest 20 intents 


// 1. Intent Handlers =============================================

const AMAZON_FallbackIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousSpeech = getPreviousSpeechOutput(sessionAttributes);

        return responseBuilder
            .speak('Sorry I didnt catch what you said, ' + stripSpeak(previousSpeech.outputSpeech))
            .reprompt(stripSpeak(previousSpeech.reprompt))
            .getResponse();
    },
};

const AMAZON_CancelIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, talk to you later! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_HelpIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'];
        let intents = getCustomIntents();
        let sampleIntent = randomElement(intents);

        let say = 'You asked for help. '; 

        let previousIntent = getPreviousIntent(sessionAttributes);
        if (previousIntent && !handlerInput.requestEnvelope.session.new) {
             say += 'Your last intent was ' + previousIntent + '. ';
         }
        // say +=  'I understand  ' + intents.length + ' intents, '

        say += ' Here something you can ask me, ' + getSampleUtterance(sampleIntent);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_StopIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, talk to you later! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NavigateHomeIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const GetSummonerRank_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'GetSummonerRank' ;
    },
    async handle(handlerInput) {
        let response = 'blank';
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // delegate to Alexa to collect all the required slots 
        const currentIntent = request.intent; 
        if (request.dialogState && request.dialogState !== 'COMPLETED') { 
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();

        } 
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        response = await lookup(slotValues.CHAMPION_NAME.resolved, handlerInput.requestEnvelope.session['user']['accessToken']);
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: CHAMPION_NAME 
        if (slotValues.CHAMPION_NAME.heardAs && slotValues.CHAMPION_NAME.heardAs !== '') {
            slotStatus += slotValues.CHAMPION_NAME.heardAs + '. '
        } else {
            slotStatus += 'slot CHAMPION_NAME is empty. ';
        }
        if (slotValues.CHAMPION_NAME.ERstatus === 'ER_SUCCESS_MATCH') {
            if(slotValues.CHAMPION_NAME.resolved !== slotValues.CHAMPION_NAME.heardAs) {
                slotStatus += 'synonym for ' + slotValues.CHAMPION_NAME.resolved + '. '; 
                } 
        }
        if (slotValues.CHAMPION_NAME.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.CHAMPION_NAME.heardAs + '" to the custom slot type used by slot CHAMPION_NAME! '); 
        }

        if( (slotValues.CHAMPION_NAME.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.CHAMPION_NAME.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('GetSummonerRank','CHAMPION_NAME'), 'or');
        }

        if (response !== undefined && response !== null) {
            slotStatus += response;
        };   

        say += slotStatus;
        return responseBuilder
        .speak(say)
        .reprompt('try again, ' + say)
        .getResponse();
    },
};

const LaunchRequest_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const responseBuilder = handlerInput.responseBuilder;
        const request = handlerInput.requestEnvelope.request;

        let say = 'hello' + ' and welcome to ' + invocationName + ' ! Say help to hear some options.';
        //accessToken = handlerInput.requestEnvelope.session['user']['accessToken'];
        let skillTitle = capitalize(invocationName);


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .withStandardCard('Welcome!', 
              'Hello!\nThis is a card for your skill, ' + skillTitle,
               welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
            .getResponse();
    },
};

const SessionEndedHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler =  {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        // console.log(`Original Request was: ${JSON.stringify(request, null, 2)}`);

        return handlerInput.responseBuilder
            .speak(`Sorry, your skill got this error.  ${error.message} `)
            .reprompt(`Sorry, your skill got this error.  ${error.message} `)
            .getResponse();
    }
};


// 2. Constants ===========================================================================

    // Here you can define static data, to be used elsewhere in your code.  For example: 
    //    const myString = "Hello World";
    //    const myArray  = [ "orange", "grape", "strawberry" ];
    //    const myObject = { "city": "Boston",  "state":"Massachusetts" };

const APP_ID = undefined;  // TODO replace with your Skill ID (OPTIONAL).

// 3.  Helper Functions ===================================================================

// async function lookupHelper(championName) {
//     let promise =  new Promise((resolve, reject) => {
//         resolve(lookup(championName));
//     });
//     return await promise;
// }

function capitalize(myString) {

     return myString.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }) ;
}

 
function randomElement(myArray) { 
    return(myArray[Math.floor(Math.random() * myArray.length)]); 
} 
 
function stripSpeak(str) { 
    return(str.replace('<speak>', '').replace('</speak>', '')); 
} 
 
 
 
 
function getSlotValues(filledSlots) { 
    const slotValues = {}; 
 
    Object.keys(filledSlots).forEach((item) => { 
        const name  = filledSlots[item].name; 
 
        if (filledSlots[item] && 
            filledSlots[item].resolutions && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0] && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
                case 'ER_SUCCESS_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name, 
                        ERstatus: 'ER_SUCCESS_MATCH' 
                    }; 
                    break; 
                case 'ER_SUCCESS_NO_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: '', 
                        ERstatus: 'ER_SUCCESS_NO_MATCH' 
                    }; 
                    break; 
                default: 
                    break; 
            } 
        } else { 
            slotValues[name] = { 
                heardAs: filledSlots[item].value || '', // may be null 
                resolved: '', 
                ERstatus: '' 
            }; 
        } 
    }, this); 
 
    return slotValues; 
} 
 
function getExampleSlotValues(intentName, slotName) { 
 
    let examples = []; 
    let slotType = ''; 
    let slotValuesFull = []; 
 
    let intents = model.interactionModel.languageModel.intents; 
    for (let i = 0; i < intents.length; i++) { 
        if (intents[i].name == intentName) { 
            let slots = intents[i].slots; 
            for (let j = 0; j < slots.length; j++) { 
                if (slots[j].name === slotName) { 
                    slotType = slots[j].type; 
 
                } 
            } 
        } 
 
    } 
    let types = model.interactionModel.languageModel.types; 
    for (let i = 0; i < types.length; i++) { 
        if (types[i].name === slotType) { 
            slotValuesFull = types[i].values; 
        } 
    } 
 
    slotValuesFull = shuffleArray(slotValuesFull); 
 
    examples.push(slotValuesFull[0].name.value); 
    examples.push(slotValuesFull[1].name.value); 
    if (slotValuesFull.length > 2) { 
        examples.push(slotValuesFull[2].name.value); 
    } 
 
 
    return examples; 
} 
 
function sayArray(myData, penultimateWord = 'and') { 
    let result = ''; 
 
    myData.forEach(function(element, index, arr) { 
 
        if (index === 0) { 
            result = element; 
        } else if (index === myData.length - 1) { 
            result += ` ${penultimateWord} ${element}`; 
        } else { 
            result += `, ${element}`; 
        } 
    }); 
    return result; 
} 
function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.) 
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay 
    const hasDisplay = 
        handlerInput.requestEnvelope.context && 
        handlerInput.requestEnvelope.context.System && 
        handlerInput.requestEnvelope.context.System.device && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display; 
 
    return hasDisplay; 
} 
 
 
const welcomeCardImg = { 
    smallImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane720_480.png", 
    largeImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane1200_800.png" 
 
 
}; 
 
const DisplayImg1 = { 
    title: 'Jet Plane', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/plane340_340.png' 
}; 
const DisplayImg2 = { 
    title: 'Starry Sky', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/background1024_600.png' 
 
}; 
 
function getCustomIntents() { 
    const modelIntents = model.interactionModel.languageModel.intents; 
 
    let customIntents = []; 
 
 
    for (let i = 0; i < modelIntents.length; i++) { 
 
        if(modelIntents[i].name.substring(0,7) != "AMAZON." && modelIntents[i].name !== "LaunchRequest" ) { 
            customIntents.push(modelIntents[i]); 
        } 
    } 
    return customIntents; 
} 
 
function getSampleUtterance(intent) { 
 
    return randomElement(intent.samples); 
 
} 
 
function getPreviousIntent(attrs) { 
 
    if (attrs.history && attrs.history.length > 1) { 
        return attrs.history[attrs.history.length - 2].IntentRequest; 
 
    } else { 
        return false; 
    } 
 
} 
 
function getPreviousSpeechOutput(attrs) { 
 
    if (attrs.lastSpeechOutput && attrs.history.length > 1) { 
        return attrs.lastSpeechOutput; 
 
    } else { 
        return false; 
    } 
 
} 
 
function timeDelta(t1, t2) { 
 
    const dt1 = new Date(t1); 
    const dt2 = new Date(t2); 
    const timeSpanMS = dt2.getTime() - dt1.getTime(); 
    const span = { 
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60 )), 
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)), 
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)), 
        "timeSpanDesc" : "" 
    }; 
 
 
    if (span.timeSpanHR < 2) { 
        span.timeSpanDesc = span.timeSpanMIN + " minutes"; 
    } else if (span.timeSpanDAY < 2) { 
        span.timeSpanDesc = span.timeSpanHR + " hours"; 
    } else { 
        span.timeSpanDesc = span.timeSpanDAY + " days"; 
    } 
 
 
    return span; 
 
} 
 
 
const InitMemoryAttributesInterceptor = { 
    process(handlerInput) { 
        let sessionAttributes = {}; 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            let memoryAttributes = getMemoryAttributes(); 
 
            if(Object.keys(sessionAttributes).length === 0) { 
 
                Object.keys(memoryAttributes).forEach(function(key) {  // initialize all attributes from global list 
 
                    sessionAttributes[key] = memoryAttributes[key]; 
 
                }); 
 
            } 
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
 
        } 
    } 
}; 
 
const RequestHistoryInterceptor = { 
    process(handlerInput) { 
 
        const thisRequest = handlerInput.requestEnvelope.request; 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
        let history = sessionAttributes['history'] || []; 
 
        let IntentRequest = {}; 
        if (thisRequest.type === 'IntentRequest' ) { 
 
            let slots = []; 
 
            IntentRequest = { 
                'IntentRequest' : thisRequest.intent.name 
            }; 
 
            if (thisRequest.intent.slots) { 
 
                for (let slot in thisRequest.intent.slots) { 
                    let slotObj = {}; 
                    slotObj[slot] = thisRequest.intent.slots[slot].value; 
                    slots.push(slotObj); 
                } 
 
                IntentRequest = { 
                    'IntentRequest' : thisRequest.intent.name, 
                    'slots' : slots 
                }; 
 
            } 
 
        } else { 
            IntentRequest = {'IntentRequest' : thisRequest.type}; 
        } 
        if(history.length > maxHistorySize - 1) { 
            history.shift(); 
        } 
        history.push(IntentRequest); 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
 
}; 
 
 
 
 
const RequestPersistenceInterceptor = { 
    process(handlerInput) { 
 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            return new Promise((resolve, reject) => { 
 
                handlerInput.attributesManager.getPersistentAttributes() 
 
                    .then((sessionAttributes) => { 
                        sessionAttributes = sessionAttributes || {}; 
 
 
                        sessionAttributes['launchCount'] += 1; 
 
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
                        handlerInput.attributesManager.savePersistentAttributes() 
                            .then(() => { 
                                resolve(); 
                            }) 
                            .catch((err) => { 
                                reject(err); 
                            }); 
                    }); 
 
            }); 
 
        } // end session['new'] 
    } 
}; 
 
 
const ResponseRecordSpeechOutputInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
        let lastSpeechOutput = { 
            "outputSpeech":responseOutput.outputSpeech.ssml, 
            "reprompt":responseOutput.reprompt.outputSpeech.ssml ,
        }; 
 
        sessionAttributes['lastSpeechOutput'] = lastSpeechOutput; 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
}; 
 
const ResponsePersistenceInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession); 
 
        if(ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out 
 
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime(); 
 
            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes); 
 
            return new Promise((resolve, reject) => { 
                handlerInput.attributesManager.savePersistentAttributes() 
                    .then(() => { 
                        resolve(); 
                    }) 
                    .catch((err) => { 
                        reject(err); 
                    }); 
 
            }); 
 
        } 
 
    } 
}; 
 
 
function shuffleArray(array) {  // Fisher Yates shuffle! 
 
    let currentIndex = array.length, temporaryValue, randomIndex; 
 
    while (0 !== currentIndex) { 
 
        randomIndex = Math.floor(Math.random() * currentIndex); 
        currentIndex -= 1; 
 
        temporaryValue = array[currentIndex]; 
        array[currentIndex] = array[randomIndex]; 
        array[randomIndex] = temporaryValue; 
    } 
 
    return array; 
} 
// 4. Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
    .addRequestHandlers(
        AMAZON_FallbackIntent_Handler, 
        AMAZON_CancelIntent_Handler, 
        AMAZON_HelpIntent_Handler, 
        AMAZON_StopIntent_Handler, 
        AMAZON_NavigateHomeIntent_Handler, 
        GetSummonerRank_Handler, 
        LaunchRequest_Handler, 
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)

   // .addResponseInterceptors(ResponseRecordSpeechOutputInterceptor)

 // .addRequestInterceptors(RequestPersistenceInterceptor)
 // .addResponseInterceptors(ResponsePersistenceInterceptor)

 // .withTableName("askMemorySkillTable")
 // .withAutoCreateTable(true)

    .lambda();


// End of Skill code -------------------------------------------------------------
// Static Language Model for reference

const model = {
  "interactionModel": {
    "languageModel": {
      "invocationName": "league lookup",
      "intents": [
        {
          "name": "AMAZON.FallbackIntent",
          "samples": []
        },
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NavigateHomeIntent",
          "samples": []
        },
        {
          "name": "GetSummonerRank",
          "slots": [
            {
              "name": "CHAMPION_NAME",
              "type": "CHAMPION_NAME",
              "samples": [
                "{CHAMPION_NAME}"
              ]
            }
          ],
          "samples": [
            "what rank is the  {CHAMPION_NAME}",
            "what is {CHAMPION_NAME}  rank"
          ]
        },
        {
          "name": "LaunchRequest"
        }
      ],
      "types": [
        {
          "name": "CHAMPION_NAME",
          "values": [
            {
                "name": {
                    "value": "zyra"
                }
            },
            {
                "name": {
                  "value": "zilean"
                }
              },
            {
                "name": {
                  "value": "ziggs"
                }
              },
            {
                "name": {
                  "value": "zed"
                }
              },
            {
                "name": {
                  "value": "zac"
                }
              },
            {
                "name": {
                  "value": "yorick"
                }
              },
            {
                "name": {
                  "value": "yasuo"
                }
              },
            {
                "name": {
                  "value": "xinzhao"
                }
              },
            {
                "name": {
                  "value": "xerath"
                }
              },
            {
                "name": {
                  "value": "warwick"
                }
              },
            {
                "name": {
                  "value": "volibear"
                }
              },
            {
                "name": {
                  "value": "vladimir"
                }
              },
            {
                "name": {
                  "value": "viktor"
                }
              },
            {
                "name": {
                  "value": "vi"
                }
              },
            {
                "name": {
                  "value": "velkoz"
                }
              },
            {
                "name": {
                  "value": "veigar"
                }
              },
            {
                "name": {
                  "value": "vayne"
                }
              },
            {
                "name": {
                  "value": "varus"
                }
              },
            {
                "name": {
                  "value": "urgot"
                }
              },
            {
                "name": {
                  "value": "udyr"
                }
              },
            {
                "name": {
                  "value": "twitch"
                }
              },
            {
                "name": {
                  "value": "twistedfate"
                }
              },
            {
                "name": {
                  "value": "tryndamere"
                }
              },
            {
                "name": {
                  "value": "trundle"
                }
              },
            {
                "name": {
                  "value": "tristana"
                }
              },
            {
                "name": {
                  "value": "thresh"
                }
              },
            {
                "name": {
                  "value": "teemo"
                }
              },
            {
                "name": {
                  "value": "taric"
                }
              },
            {
                "name": {
                  "value": "talon"
                }
              },
            {
                "name": {
                  "value": "taliyah"
                }
              },
            {
                "name": {
                  "value": "tahmkench"
                }
              },
            {
                "name": {
                  "value": "syndra"
                }
              },
            {
                "name": {
                  "value": "swain"
                }
              },
            {
                "name": {
                  "value": "soraka"
                }
              },
            {
                "name": {
                  "value": "sona"
                }
              },
            {
                "name": {
                  "value": "skarner"
                }
              },
            {
                "name": {
                  "value": "sivir"
                }
              },
            {
                "name": {
                  "value": "sion"
                }
              },
            {
                "name": {
                  "value": "singed"
                }
              },
            {
                "name": {
                  "value": "shyvana"
                }
              },
            {
                "name": {
                  "value": "shen"
                }
              },
            {
                "name": {
                  "value": "shaco"
                }
              },
            {
                "name": {
                  "value": "sejuani"
                }
              },
            {
                "name": {
                  "value": "ryze"
                }
              },
            {
                "name": {
                  "value": "rumble"
                }
              },
            {
                "name": {
                  "value": "riven"
                }
              },
            {
                "name": {
                  "value": "rengar"
                }
              },
            {
                "name": {
                  "value": "renekton"
                }
              },
            {
                "name": {
                  "value": "reksai"
                }
              },
            {
                "name": {
                  "value": "rammus"
                }
              },
            {
                "name": {
                  "value": "quinn"
                }
              },
            {
                "name": {
                  "value": "poppy"
                }
              },
            {
                "name": {
                  "value": "pantheon"
                }
              },
            {
                "name": {
                  "value": "orianna"
                }
              },
            {
                "name": {
                  "value": "olaf"
                }
              },
            {
                "name": {
                  "value": "nunu"
                }
              },
            {
                "name": {
                  "value": "nocturne"
                }
              },
            {
                "name": {
                  "value": "nidalee"
                }
              },
            {
                "name": {
                  "value": "nautilus"
                }
              },
            {
                "name": {
                  "value": "nasus"
                }
              },
            {
                "name": {
                  "value": "nami"
                }
              },
            {
                "name": {
                  "value": "morgana"
                }
              },
            {
                "name": {
                  "value": "mordekaiser"
                }
              },
            {
                "name": {
                  "value": "wukong"
                }
              },
            {
                "name": {
                  "value": "missfortune"
                }
              },
            {
                "name": {
                  "value": "masteryi"
                }
              },
            {
                "name": {
                  "value": "maokai"
                }
              },
            {
                "name": {
                  "value": "malzahar"
                }
              },
            {
                "name": {
                  "value": "malphite"
                }
              },
            {
                "name": {
                  "value": "lux"
                }
              },
            {
                "name": {
                  "value": "lulu"
                }
              },
            {
                "name": {
                  "value": "lucian"
                }
              },
            {
                "name": {
                  "value": "lissandra"
                }
              },
            {
                "name": {
                  "value": "leona"
                }
              },
            {
                "name": {
                  "value": "leesin"
                }
              },
            {
                "name": {
                  "value": "leblanc"
                }
              },
            {
                "name": {
                  "value": "kogmaw"
                }
              },
            {
                "name": {
                  "value": "kled"
                }
              },
            {
                "name": {
                  "value": "kindred"
                }
              },
            {
                "name": {
                  "value": "khazix"
                }
              },
            {
                "name": {
                  "value": "kennen"
                }
              },
            {
                "name": {
                  "value": "kayle"
                }
              },
            {
                "name": {
                  "value": "katarina"
                }
              },
            {
                "name": {
                  "value": "kassadin"
                }
              },
            {
                "name": {
                  "value": "karthus"
                }
              },
            {
                "name": {
                  "value": "karma"
                }
              },
            {
                "name": {
                  "value": "kalista"
                }
              },
            {
                "name": {
                  "value": "jinx"
                }
              },
            {
                "name": {
                  "value": "jhin"
                }
              },
            {
                "name": {
                  "value": "jayce"
                }
              },
            {
                "name": {
                  "value": "jax"
                }
              },
            {
                "name": {
                  "value": "jarvan"
                }
              },
            {
                "name": {
                  "value": "janna"
                }
              },
            {
                "name": {
                  "value": "ivern"
                }
              },
            {
                "name": {
                  "value": "irelia"
                }
              },
            {
                "name": {
                  "value": "illaoi"
                }
              },
            {
                "name": {
                  "value": "heimerdinger"
                }
              },
            {
                "name": {
                  "value": "hecarim"
                }
              },
            {
                "name": {
                  "value": "graves"
                }
              },
            {
                "name": {
                  "value": "gragas"
                }
              },
            {
                "name": {
                  "value": "gnar"
                }
              },
            {
                "name": {
                  "value": "garen"
                }
              },
            {
                "name": {
                  "value": "gangplank"
                }
              },
            {
                "name": {
                  "value": "galio"
                }
              },
            {
                "name": {
                  "value": "fizz"
                }
              },
            {
                "name": {
                  "value": "fiora"
                }
              },
            {
                "name": {
                  "value": "fiddlesticks"
                }
              },
            {
                "name": {
                  "value": "ezreal"
                }
              },
            {
                "name": {
                  "value": "evelynn"
                }
              },
            {
                "name": {
                  "value": "elise"
                }
              },
            {
                "name": {
                  "value": "ekko"
                }
              },
            {
                "name": {
                  "value": "drmundo"
                }
              },
            {
                "name": {
                  "value": "draven"
                }
              },
            {
                "name": {
                  "value": "diana"
                }
              },
            {
                "name": {
                  "value": "darius"
                }
              },
            {
                "name": {
                  "value": "corki"
                }
              },
            {
                "name": {
                  "value": "chogath"
                }
              },
            {
                "name": {
                  "value": "cassiopeia"
                }
              },
            {
                "name": {
                  "value": "camille"
                }
              },
            {
                "name": {
                  "value": "caitlyn"
                }
              },
            {
              "name": {
                "value": "braum"
              }
            },
            {
              "name": {
                "value": "brand"
              }
            },
            {
              "name": {
                "value": "blitzcrank"
              }
            },
            {
              "name": {
                "value": "bard"
              }
            },
            {
              "name": {
                "value": "azir"
              }
            },
            {
              "name": {
                "value": "aurelion Sol"
              }
            },
            {
              "name": {
                "value": "ashe"
              }
            },
            {
              "name": {
                "value": "annie"
              }
            },
            {
              "name": {
                "value": "anivia"
              }
            },
            {
              "name": {
                "value": "amumu"
              }
            },
            {
              "name": {
                "value": "alistar"
              }
            },
            {
              "name": {
                "value": "akali"
              }
            },
            {
              "name": {
                "value": "ahri"
              }
            },
            {
              "name": {
                "value": "aatrox"
              }
            }
          ]
        }
      ]
    },
    "dialog": {
      "intents": [
        {
          "name": "GetSummonerRank",
          "confirmationRequired": false,
          "prompts": {},
          "slots": [
            {
              "name": "CHAMPION_NAME",
              "type": "CHAMPION_NAME",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.711592471873.1363534602291"
              }
            }
          ]
        }
      ],
      "delegationStrategy": "ALWAYS"
    },
    "prompts": [
      {
        "id": "Elicit.Slot.711592471873.1363534602291",
        "variations": [
          {
            "type": "PlainText",
            "value": "what champion would you like to look up"
          }
        ]
      }
    ]
  }
};
