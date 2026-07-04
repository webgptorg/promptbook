import { describe, expect, it } from '@jest/globals';
import type { Node } from 'reactflow';
import type { AgentWithVisibility, GraphLink, GraphNode, ServerGroup } from './buildGraphDataTypes';
import { buildGraphLayoutNodes } from './buildGraphLayoutNodes';

/**
 * Local server URL used by graph layout fixtures.
 */
const LOCAL_SERVER_URL = 'https://local.test';

/**
 * Remote server URL used by graph layout fixtures.
 */
const REMOTE_SERVER_URL = 'https://remote.test';

/**
 * Width of rendered agent graph nodes.
 */
const AGENT_NODE_WIDTH = 220;

/**
 * Height of rendered agent graph nodes.
 */
const AGENT_NODE_HEIGHT = 64;

/**
 * Creates a minimal agent fixture for graph layout tests.
 */
function createAgent(agentName: string, folderId: number | null, serverUrl: string): AgentWithVisibility {
    return {
        agentName,
        agentHash: `${agentName}-hash`,
        permanentId: `${agentName}-id`,
        personaDescription: `${agentName} summary`,
        initialMessage: null,
        meta: {
            fullname: agentName,
            description: `${agentName} description`,
            color: '#0f766e',
        },
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        folderId,
        sortOrder: 0,
        serverUrl,
    };
}

/**
 * Creates one graph node fixture.
 */
function createGraphNode(agentName: string, folderId: number | null, serverUrl: string, sortOrder: number): GraphNode {
    const agent = createAgent(agentName, folderId, serverUrl);

    return {
        id: `${serverUrl}/${agent.permanentId}`,
        name: agentName,
        agent,
        serverUrl,
        isLocal: serverUrl === LOCAL_SERVER_URL,
        folderId,
        sortOrder,
    };
}

/**
 * Creates one server group fixture.
 */
function createServerGroup(
    serverUrl: string,
    folders: ReadonlyArray<{ id: number | null; label: string; agents: GraphNode[] }>,
): ServerGroup {
    return {
        serverUrl,
        label: serverUrl.replace(/^https?:\/\//, ''),
        isLocal: serverUrl === LOCAL_SERVER_URL,
        folders: folders.map((folder) => ({
            id: folder.id,
            label: folder.label,
            agents: folder.agents,
        })),
    };
}

/**
 * Returns a rendered React Flow node by id.
 */
function getRequiredNode(nodes: ReadonlyArray<Node>, nodeId: string): Node {
    const node = nodes.find((candidate) => candidate.id === nodeId);

    expect(node).toBeDefined();

    return node as Node;
}

/**
 * Reads a numeric style dimension from a React Flow node.
 */
function getNodeDimension(node: Node, dimension: 'width' | 'height'): number {
    const value = node.style?.[dimension];

    expect(typeof value).toBe('number');

    return value as number;
}

/**
 * Returns the visual center of a rendered node in its parent coordinate system.
 */
function getNodeCenter(node: Node): { x: number; y: number } {
    return {
        x: node.position.x + getNodeDimension(node, 'width') / 2,
        y: node.position.y + getNodeDimension(node, 'height') / 2,
    };
}

/**
 * Builds graph layout nodes from test server groups.
 */
function buildTestLayoutNodes(serverGroups: ServerGroup[], links: GraphLink[] = []): Node[] {
    return buildGraphLayoutNodes({
        serverGroups,
        links,
        orderIndexByNodeId: new Map(),
        publicUrl: LOCAL_SERVER_URL,
        storedPositions: {},
        onNodeOpen: () => undefined,
    });
}

describe('buildGraphLayoutNodes', () => {
    it('keeps the current server centered in the graph', () => {
        const localAgent = createGraphNode('Local Agent', null, LOCAL_SERVER_URL, 0);
        const remoteAgent = createGraphNode('Remote Agent', null, REMOTE_SERVER_URL, 0);
        const nodes = buildTestLayoutNodes([
            createServerGroup(LOCAL_SERVER_URL, [{ id: null, label: 'Agents', agents: [localAgent] }]),
            createServerGroup(REMOTE_SERVER_URL, [{ id: null, label: 'Remote', agents: [remoteAgent] }]),
        ]);
        const localServerNode = getRequiredNode(nodes, `server:${LOCAL_SERVER_URL}`);
        const localServerCenter = getNodeCenter(localServerNode);

        expect(localServerCenter.x).toBeCloseTo(0);
        expect(localServerCenter.y).toBeCloseTo(0);
    });

    it('places many agents in a center-out free layout instead of a single ring', () => {
        const agents = Array.from({ length: 9 }, (_, index) =>
            createGraphNode(`Agent ${index + 1}`, 1, LOCAL_SERVER_URL, index),
        );
        const nodes = buildTestLayoutNodes([
            createServerGroup(LOCAL_SERVER_URL, [{ id: 1, label: 'Research', agents }]),
        ]);
        const folderNode = getRequiredNode(nodes, `folder:${LOCAL_SERVER_URL}:1`);
        const folderCenter = {
            x: getNodeDimension(folderNode, 'width') / 2,
            y: getNodeDimension(folderNode, 'height') / 2,
        };
        const agentDistances = agents.map((agent) => {
            const node = getRequiredNode(nodes, agent.id);
            const center = {
                x: node.position.x + AGENT_NODE_WIDTH / 2,
                y: node.position.y + AGENT_NODE_HEIGHT / 2,
            };

            return Math.hypot(center.x - folderCenter.x, center.y - folderCenter.y);
        });
        const closestAgentDistance = Math.min(...agentDistances);
        const farthestAgentDistance = Math.max(...agentDistances);
        const roundedDistanceBuckets = new Set(agentDistances.map((distance) => Math.round(distance / 40)));

        expect(closestAgentDistance).toBeLessThan(farthestAgentDistance / 3);
        expect(roundedDistanceBuckets.size).toBeGreaterThan(2);
    });

    it('places folder subsets across both axes inside the server boundary', () => {
        const folders = Array.from({ length: 5 }, (_, index) => {
            const folderId = index + 1;

            return {
                id: folderId,
                label: `Folder ${folderId}`,
                agents: [createGraphNode(`Agent ${folderId}`, folderId, LOCAL_SERVER_URL, index)],
            };
        });
        const nodes = buildTestLayoutNodes([createServerGroup(LOCAL_SERVER_URL, folders)]);
        const folderCenters = folders.map((folder) => getNodeCenter(getRequiredNode(nodes, `folder:${LOCAL_SERVER_URL}:${folder.id}`)));
        const horizontalBuckets = new Set(folderCenters.map((center) => Math.round(center.x / 40)));
        const verticalBuckets = new Set(folderCenters.map((center) => Math.round(center.y / 40)));

        expect(horizontalBuckets.size).toBeGreaterThan(1);
        expect(verticalBuckets.size).toBeGreaterThan(1);
    });
});
