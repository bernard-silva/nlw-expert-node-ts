import fastify from "fastify";
import cookie from '@fastify/cookie'
import websocket from "@fastify/websocket";
import { createPoll } from "./routes/create-poll";
import { getPoll } from "./routes/get-poll";
import { voteOnPoll } from "./routes/vote-on-poll";
import { pollResults } from "./ws/poll-results";

const app = fastify()

app.register(cookie, {
  secret: "polls-app-nlw", // assinatura única vinda do servidor, sem que o usuario possa alterar no navegador
  hook: 'onRequest', // antes de todas as requisições para o backend, ele faz o parse dos cookies colocando em um objeto
})

app.register(websocket)

// usando o register do fastify para importar a rota createPoll
app.register(createPoll)
app.register(getPoll)
app.register(voteOnPoll)

app.register(pollResults)

app.listen({ port: 3333 }).then(() => {
  console.log("HTTP server running!")
})
