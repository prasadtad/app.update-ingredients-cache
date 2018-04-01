// cache/find-recipes.js

const _ = require('lodash')
const RedisPoco = require('redis-poco')
const RedisPhraseComplete = require('redis-phrase-complete')

module.exports = class UpdateIngredients
{
    constructor()
    {        
        this.ingredientsPoco = new RedisPoco({ namespace: 'ingredient', itemKey: 'item', endpoint: process.env.CACHE_ENDPOINT, attributes: [ 'vegan', 'category' ]})
        this.ingredientsPhraseComplete = new RedisPhraseComplete({ namespace: 'ingredient:autocomplete', client: this.ingredientsPoco.client })
        _.bindAll(this, 'whenStore', 'whenQuit')
    }

    whenStore(ingredients)
    {
        return Promise.all([
            this.ingredientsPoco.whenRemoveAll(),
            this.ingredientsPhraseComplete.whenRemoveAll()]).then(() => {
                const whenAddAllIngredients = _.map(ingredients, ingredient => this.ingredientsPoco.whenStore(ingredient))
                const whenAddAllSentences = _.flatMap(ingredients, ingredient => 
                    _.map(ingredient.names, name => 
                        this.ingredientsPhraseComplete.whenAdd(name, ingredient.id)))                
                return Promise.all(_.concat(whenAddAllIngredients, whenAddAllSentences))
            })
    }

    whenQuit()
    {
        return this.ingredientsPoco.whenQuit()
    }
}