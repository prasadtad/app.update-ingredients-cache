// tests.js

var _ = require('lodash')
var assert = require('assert')

const fs = require('fs')
const path = require('path')

const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)

AWS.mock('S3', 'getObject', function (params, callback) {
    const file = path.join(__dirname, "testfiles", params.Key)
    callback(null, { Body: fs.readFileSync(file) })
})

const index = require('./index')

const RedisPoco = require('redis-poco')
const RedisPhraseComplete = require('redis-phrase-complete')

const ingredientsPoco = new RedisPoco({ namespace: 'ingredient', itemKey: 'item', endpoint: process.env.CACHE_ENDPOINT, attributes: [ 'vegan', 'category' ]})
const ingredientsPhraseComplete = new RedisPhraseComplete({ namespace: 'ingredient:autocomplete', client: ingredientsPoco.client })

const putEvent = {  
    "Records": [  
        {
            "eventName": "ObjectCreated:Put",
            "s3": {
                "bucket": {  
                    "name":"recipeshelf"
                },
                "object": {  
                    "key":"ingredients.json"
                }
            }
        }
    ]
}

const whenAssertIngredientsAdded = () => {
    return ingredientsPoco.whenGet("-GB41Pde")
            .then(ingredient => {
                assert.deepEqual(ingredient, {
                    "id": "-GB41Pde",
                    "lastModified": "2016-05-07T12:31:14.15Z",
                    "names": [
                      "Turmeric"
                    ],
                    "vegan": true
                  })
                return Promise.resolve()
            })
            .then(() => ingredientsPhraseComplete.whenFind('brinjal'))
            .then(results => {
                assert.deepEqual(results, [{ sentence: 'Brinjal', id: 'N2YXf2ns' }])
                return Promise.resolve()
            })
}  

let testMessages = [], tests = []
  
tests.push(index.whenHandler({blah: true})
            .catch(err => {
                testMessages.push('Errors are bubbled up')
                assert.equal(err.message, 'Cannot read property \'length\' of undefined')
                return Promise.resolve()
            }))

tests.push(ingredientsPoco.whenFlush()
                .then(() => index.whenHandler(putEvent))
                .then(() => {
                    testMessages.push('Putting ingredients')
                    return whenAssertIngredientsAdded()
                })                         
            )      

Promise.all(tests)
        .then(() => {
            console.info(_.map(testMessages, m => m + ' - passed').join('\n'))
            process.exit()
        })
        .catch(err => {
            console.error(err)
            process.exit()            
        })


