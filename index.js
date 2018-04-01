// index.js

const _ = require('lodash')

const S3Proxy = require('./proxies/s3-proxy'),
    s3Proxy = new S3Proxy('recipeshelf')

const whenIngredients = s3Proxy.whenGetObject('ingredients.json')

const UpdateIngredients = require('./cache/update-ingredients')

const whenQuit = (updateIngredients, err) => updateIngredients.whenQuit().then(() => Promise.reject(err))

exports.whenHandler = (event) => {
    if (!event) return Promise.reject(new Error('Invalid event - ' + JSON.stringify(event)))        
    if (!_.isObject(event)) return Promise.reject(new Error('Invalid event - ' + JSON.stringify(event)))        
    console.info(JSON.stringify(event))
    const updateIngredients = new UpdateIngredients()
    try
    {        
        if (event.Records.length !== 1 || 
            !event.Records[0].eventName.startsWith('ObjectCreated:') ||
            event.Records[0].s3.object.key !== 'ingredients.json')
            Promise.reject(new Error('Invalid event - ' + JSON.stringify(event))) 
        return whenIngredients
            .then(updateIngredients.whenStore)
            .then(updateIngredients.whenQuit)
            .catch(err => whenQuit(updateIngredients, err))
    }
    catch (err)
    {
        return whenQuit(updateIngredients, err)
    }
}

exports.handler = (event, context, callback) => {
    exports.whenHandler(event)
            .then(result => callback(null, result))
            .catch(err => callback(err))    
}
