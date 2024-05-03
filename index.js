/*
 * Copyright (c) 2020-2023 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

const { VM } = require('vm2')
const fs = require('fs')
const path = require('path') // eslint-disable-line no-unused-vars
const ctx = fs.readFileSync(`${__dirname}/factory.js`).toString()
const NlpManager = require('./nlp')

class Bot {
  constructor (name, greeting, trainingSet, defaultResponse) {
    this.name = name
    this.greeting = greeting
    this.defaultResponse = { action: 'response', body: defaultResponse }
    this.training = {
      state: false,
      data: trainingSet
    }
    this.factory = new VM({
      sandbox: {
        Nlp: NlpManager,
        training: this.training
      }
    })
    this.factory.run(ctx)
    this.factory.run(`trainingSet=${trainingSet}`)
  }

  greet (token) {
    return this.render(this.greeting, token)
  }

  addUser(token, name) {
    const sanitizedToken = sanitizeInput(token);
    const sanitizedName = sanitizeInput(name);
    this.factory.run(`users.addUser("${sanitizedToken}", "${sanitizedName}")`);
  }

  getUser (token) {
    return this.factory.run(`users.get("${token}")`)
  }

  render (statement, token) {
    return statement.replace(/<bot-name>/g, this.name).replace(/<customer-name>/g, this.factory.run(`currentUser(${token})`))
  }

  async respond (query, token) {
    const response = (await this.factory.run(`process("${query}", "${token}")`)).answer
    if (!response) {
      return this.defaultResponse
    } else {
      if (response.body) {
        response.body = this.render(response.body, token)
      }
      return response
    }
  }

  train () {
    return this.factory.run('train()')
  }
}

function sanitizeInput(input) {
  // Basic, replace with a more robust solution if needed
  return input.replace(/[^a-zA-Z0-9 ]/g, ''); // Strips out characters except alphanumeric and space 
}

exports.Bot = Bot
