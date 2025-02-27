import express from 'express'

import { Liquid } from 'liquidjs';


// Vul hier jullie team naam in
const teamName = 'Rocket';


let loggedIn = false;


// Haal alle eerstejaars squads uit de WHOIS API op van dit jaar (2024–2025)
const squadResponse = await fetch('https://fdnd.directus.app/items/squad?filter={"_and":[{"cohort":"2425"},{"tribe":{"name":"FDND Jaar 1"}}]}')

// Lees van de response van die fetch het JSON object in, waar we iets mee kunnen doen
const squadResponseJSON = await squadResponse.json()


const teamResponse = await fetch('https://fdnd.directus.app/items/person/?fields=team&filter[team][_neq]=null&sort=team&groupBy=team')
const teamResponseJSON = await teamResponse.json()

const personResponse = await fetch('https://fdnd.directus.app/items/person/?sort=name&fields=*,squads.squad_id.name,squads.squad_id.cohort&filter={"_and":[{"squads":{"squad_id":{"tribe":{"name":"FDND Jaar 1"}}}},{"squads":{"squad_id":{"cohort":"2425"}}}]}')
const personResponseJSON = await personResponse.json()


const app = express()

app.use(express.static('public'))

const engine = new Liquid();
app.engine('liquid', engine.express()); 

app.set('views', './views')

app.use(express.urlencoded({extended: true}))


app.get('/', async function (request, response) {
  const messagesResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName}"}`)
  const messagesResponseJSON = await messagesResponse.json()

  response.render('index.liquid', {
    teamName: teamName,
    messages: messagesResponseJSON.data,
    squads: squadResponseJSON.data,
    teams: teamResponseJSON.data,
    persons: personResponseJSON.data,
    loggedIn: loggedIn
  })
})

app.post('/', async function (request, response) {
  await fetch('https://fdnd.directus.app/items/messages/', {
    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName}`,
      from: request.body.from,
      text: request.body.text
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  response.redirect(303, '/')
})

app.get('/team/:teamName', async function(request, response) {

   const ratingForTeamResponse = await fetch(`https://fdnd.directus.app/items/messages/?sort=-created&limit=1&filter={"for":"Team ${teamName} / Rating for Team ${request.params.teamName}"}`)
   const ratingForTeamResponseJSON = await ratingForTeamResponse.json()

   response.render('team.liquid', {
     team: request.params.teamName,
     rating: ratingForTeamResponseJSON.data.length ? ratingForTeamResponseJSON.data[0].text : false
   })
})

app.post('/team/:teamName/rate', async function(request, response) {
  await fetch('https://fdnd.directus.app/items/messages/', {
    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName} / Rating for Team ${request.params.teamName}`,
      from: '',
      text: request.body.rating
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });
  response.redirect(303, `/team/${request.params.teamName}`)
})


app.get('/squad/:squadName', async function (request, response) {

  const messagesResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName} / Squad ${request.params.squadName}"}`)
  const messagesResponseJSON = await messagesResponse.json()

  const likesForSquadResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName} / Squad ${request.params.squadName} / Like"}`)
  const likesForSquadResponseJSON = await likesForSquadResponse.json()

  response.render('squad.liquid', {
    squad: request.params.squadName,
    messages: messagesResponseJSON.data,
    liked: likesForSquadResponseJSON.data.length == 1
  })
})

app.post('/squad/:squadName', async function (request, response) {
  await fetch('https://fdnd.directus.app/items/messages/', {
    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName} / Squad ${request.params.squadName}`,
      from: request.body.from,
      text: request.body.text
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  response.redirect(303, `/squad/${request.params.squadName}`)
})

app.post('/squad/:squadName/like', async function (request, response) {
  await fetch('https://fdnd.directus.app/items/messages/', {
    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName} / Squad ${request.params.squadName} / Like`,
      from: '',
      text: ''
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  response.redirect(303, `/squad/${request.params.squadName}`)
})

app.post('/squad/:squadName/unlike', async function (request, response) {

  const likesForSquadResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName} / Squad ${request.params.squadName} / Like"}`)
  const likesForSquadResponseJSON = await likesForSquadResponse.json()
  const likesForSquadResponseID = likesForSquadResponseJSON.data[0].id

  await fetch(`https://fdnd.directus.app/items/messages/${likesForSquadResponseID}`, {
    method: 'DELETE'
  });

  response.redirect(303, `/squad/${request.params.squadName}`)
})

app.post('/delete', async function (request, response) {
  await fetch(`https://fdnd.directus.app/items/messages/${request.body.message}`, {
    method: 'DELETE'
  });

  response.redirect(303, request.body.redirect)
})

app.get('/person/:id', async function(request, response) {
  const personDetailResponse = await fetch('https://fdnd.directus.app/items/person/' + request.params.id)
  const personDetailResponseJSON = await personDetailResponse.json()

  const likesForPersonResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName} / Person ${request.params.id} / Like"}`)
  const likesForPersonResponseJSON = await likesForPersonResponse.json()

  response.render('person.liquid', {
    person: personDetailResponseJSON.data,
    liked: likesForPersonResponseJSON.data.length == 1
  })
})


app.post('/person/:id/like', async function (request, response) {
  await fetch('https://fdnd.directus.app/items/messages/', {
    method: 'POST',
    body: JSON.stringify({
      for: `Team ${teamName} / Person ${request.params.id} / Like`,
      from: '',
      text: ''
    }),
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });

  response.redirect(303, `/person/${request.params.id}`)
})

app.post('/person/:id/unlike', async function (request, response) {

  const likesForPersonResponse = await fetch(`https://fdnd.directus.app/items/messages/?filter={"for":"Team ${teamName} / Person ${request.params.id} / Like"}`)
  const likesForPersonResponseJSON = await likesForPersonResponse.json()
  const likesForPersonResponseID = likesForPersonResponseJSON.data[0].id

  await fetch(`https://fdnd.directus.app/items/messages/${likesForPersonResponseID}`, {
    method: 'DELETE'
  });

  response.redirect(303, `/person/${request.params.id}`)
})


app.post('/login', function (request, response) {
   loggedIn = request.body.username
   response.redirect(303, '/')
})


app.set('port', process.env.PORT || 8000)

if (teamName == '') {
  console.log('Voeg eerst de naam van jullie team in de code toe.')
} else {
  app.listen(app.get('port'), function () {
    console.log(`Application started on http://localhost:${app.get('port')}`)
  })
}