import z from "zod"
import { randomUUID } from 'node:crypto'
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"
import { redis } from "../../lib/redis"
import { voting } from "../utils/voting-pub-sub"

export async function voteOnPoll(app: FastifyInstance) {
    app.post('/polls/:pollId/votes', async (request, reply) => {
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid()
        })
        
        const voteOnPollParams = z.object({
            pollId: z.string().uuid()
        })

        const { pollId } = voteOnPollParams.parse(request.params)
        const { pollOptionId } = voteOnPollBody.parse(request.body)

        let { sessionId }  = request.cookies

        if (sessionId) {
            const userPreviousVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId: {
                        sessionId,
                        pollId,
                    },
                }
            })

            if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId != pollOptionId) {
                await prisma.vote.delete({
                    where: {
                        id: userPreviousVoteOnPoll.id,
                    }
                })

                const votes = await redis.zincrby(pollId,-1, userPreviousVoteOnPoll.pollOptionId)

                voting.publish(pollId, {
                    pollOptionId: userPreviousVoteOnPoll.pollOptionId,
                    votes: Number(votes),
                })

            } else if (userPreviousVoteOnPoll){ 
                return reply.status(400).send({message: 'You already voted on this poll.'})
            }
        }

        if (!sessionId) {
            sessionId = randomUUID()
    
            reply.setCookie('sessionId', sessionId, {
                path: '/', // em quais rotas da aplicação poderá estar disponivel
                maxAge: 60 * 60 * 24 * 30,   // 30 dias. Significa por quanto tempo ficará disponivel, se não for importada fica um tempo muito curto
                signed: true, // essa opção impede do usuário alterar manualmente, pois vai garantir que foi gerado pelo backend
                httpOnly: true, // somente é acessível pelo backend da aplicação
            })
        }

        await prisma.vote.create({
            data: {
                sessionId,
                pollId,
                pollOptionId,
            }
        })

        const votes = await redis.zincrby(pollId, 1, pollOptionId)

        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes),
        })

        return reply.status(201).send()
    })
}