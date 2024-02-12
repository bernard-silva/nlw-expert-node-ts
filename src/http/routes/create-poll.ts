import z from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"

// essa função precisa ser assincrona senão o fastify fica carregando infinitamente
// tipar o app com FastifyInstance
export async function createPoll(app: FastifyInstance) {
    app.post('/polls', async (request, reply) => {
        const createPollBody = z.object({
            title: z.string(),
            options: z.array(z.string()),
        })
        
        const { title, options } = createPollBody.parse(request.body)
        
        const poll = await prisma.poll.create({
            data: {
                title,
                option: {
                    createMany: {
                        data: options.map(option => {
                            return { title: option } // no prisma, quando crio um relacionamento junto com 
                            // a table pai, não preciso informar o id do relacionamento
                        })
                    }
                }
            }
        })

        /* 
            Se utilizado da forma abaixo, caso ocorra um erro de transação no banco de dados
            na criação das opções, a table de Poll ja terá sido criada porém sem as opções.
            Indicado incluir o createMany
        */ 
        // await prisma.pollOption.createMany({
        //     data: options.map(option => {
        //         return { title: option, pollid: poll.id }
        //     })
        // })
        
        return reply.status(201).send({ pollId: poll.id })
    })
}