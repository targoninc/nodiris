import {CLI} from "./CLI.mjs";

export class GraphActions {
    static saveGraph(db) {
        return async (req, res) => {
            if (!req.user) {
                res.status(401).send({message: "Unauthorized"});
                return;
            }

            const {graph} = req.body;
            if (!graph) {
                res.status(400).send({message: "Graph is required"});
                return;
            }

            const json = JSON.parse(graph);
            json.version = 1;

            CLI.debug(`Saving graph: ${JSON.stringify(json)}`);
            await db.saveGraph(json);

            res.sendStatus(200);
        }
    }

    static getUserGraphs(db) {
        return async (req, res) => {
            if (!req.user) {
                res.status(401).send({message: "Unauthorized"});
                return;
            }

            const userId = req.user.id;
            CLI.debug(`Getting graphs for user ${userId}`);
            const graphs = await db.getUserGraphs(userId);

            res.send({graphs: JSON.stringify(graphs)});
        }
    }

    static getGraph(db) {
        return async (req, res) => {
            if (!req.user) {
                res.status(401).send({message: "Unauthorized"});
                return;
            }

            const {id} = req.body;
            if (!id) {
                res.status(400).send({message: "Graph ID is required"});
                return;
            }

            CLI.debug(`Getting graph with ID: ${id}`);
            const graph = await db.getGraph(id);

            if (graph.user_id !== req.user.id) {
                res.status(403).send({message: "Forbidden"});
                return;
            }

            res.send({graph: JSON.stringify(graph)});
        }
    }

    static deleteGraph(db) {
        return async (req, res) => {
            if (!req.user) {
                res.status(401).send({message: "Unauthorized"});
                return;
            }

            const {id} = req.body;
            if (!id) {
                res.status(400).send({message: "Graph ID is required"});
                return;
            }

            const graph = await db.getGraph(id);
            if (graph.user_id !== req.user.id) {
                res.status(403).send({message: "Forbidden"});
                return;
            }

            CLI.debug(`Deleting graph with ID: ${id}`);
            await db.deleteGraph(id);

            res.sendStatus(200);
        }
    }
}