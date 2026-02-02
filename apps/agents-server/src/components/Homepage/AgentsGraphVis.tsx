
/**
 * Build a timestamped filename for graph downloads.
 */
const buildGraphFilename = (extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    return `agents-graph-${timestamp}.${extension}`;
};

/**
 * Trigger a browser download for the provided blob payload.
 */
const triggerBlobDownload = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};


export function AgentsGraph(props: AgentsGraphProps) {
    const { agents, federatedAgents, federatedServersStatus, publicUrl } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const normalizedPublicUrl = useMemo(() => normalizeServerUrl(publicUrl), [publicUrl]);
    const [graphHeight, setGraphHeight] = useState(GRAPH_MIN_HEIGHT);
    const [filterType, setFilterType] = useState<ConnectionType[]>(
        parseConnectionTypes(searchParams.get('connectionTypes')),
    );
    const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(() => {
        const value = searchParams.get('selectedServer');
        if (!value) {
            return null;
        }
        if (value === 'ALL') {
            return 'ALL';
        }
        return normalizeServerUrl(value);
    });
    const [selectedAgentName, setSelectedAgentName] = useState<string | null>(
        searchParams.get('selectedAgent') || null,
    );
     const [network, setNetwork] = useState<Network | null>(null);

    const graphData = useMemo(
        () =>
            buildGraphData({
                agents,
                federatedAgents,
                filterType,
                selectedServerUrl,
                selectedAgentName,
                publicUrl: normalizedPublicUrl,
            }),
        [agents, federatedAgents, filterType, selectedServerUrl, selectedAgentName, normalizedPublicUrl],
    );

    const visJsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visJsRef.current) {
            const nodes = new DataSet<Node>(
                graphData.nodes.map((node) => ({
                    id: node.id,
                    label: node.name,
                    shape: 'image',
                    image: node.imageUrl || generatePlaceholderAgentProfileImageUrl(node.name, publicUrl),
                    brokenImage: generatePlaceholderAgentProfileImageUrl(node.name, publicUrl),
                    group: node.serverUrl,
                })),
            );

            const edges = new DataSet<Edge>(
                graphData.links.map((link) => {
                    const edge: Edge = { from: link.source, to: link.target };
                    if (link.type === 'inheritance') {
                        edge.dashes = true;
                    }
                    if (link.type === 'team') {
                        edge.color = { color: '#34d399' };
                    }
                    return edge;
                }),
            );

            const data = { nodes, edges };
            const options: Options = {
                nodes: {
                    borderWidth: 2,
                    size: 30,
                    color: {
                        border: '#222222',
                        background: '#666666',
                    },
                    font: { color: '#eeeeee' },
                },
                edges: {
                    color: 'lightgray',
                    arrows: 'to',
                },
                physics: {
                    forceAtlas2Based: {
                        gravitationalConstant: -26,
                        centralGravity: 0.005,
                        springLength: 230,
                        springConstant: 0.18,
                    },
                    maxVelocity: 146,
                    solver: 'forceAtlas2Based',
                    timestep: 0.35,
                    stabilization: { iterations: 150 },
                },
                interaction: {
                    zoomView: true,
                    dragView: true,
                    hover: true,
                },
            };
            const newNetwork = new Network(visJsRef.current, data, options);
            setNetwork(newNetwork);

            newNetwork.on('click', (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const node = graphData.nodes.find((n) => n.id === nodeId);
                    if (node) {
                        if (node.isLocal) {
                            router.push(`/agents/${encodeURIComponent(node.agent.permanentId || node.agent.agentName)}`);
                        } else {
                            window.open(`${node.serverUrl}/agents/${node.agent.agentName}`, '_blank');
                        }
                    }
                }
            });

            newNetwork.on('hoverNode', (params) => {
                newNetwork.canvas.body.container.style.cursor = 'pointer';
            });

            newNetwork.on('blurNode', (params) => {
                newNetwork.canvas.body.container.style.cursor = 'default';
            });
            
            const uniqueServers = [...new Set(graphData.nodes.map(node => node.serverUrl))];

            uniqueServers.forEach(serverUrl => {
                newNetwork.clusterByConnection(graphData.nodes.find(node => node.serverUrl === serverUrl)!.id, {
                    joinCondition: (nodeOptions) => {
                        return nodeOptions.group === serverUrl;
                    },
                    clusterNodeProperties: {
                        label: serverUrl.replace(/^https?:\/\//, ''),
                        shape: 'box',
                        color: '#f0f0f0',
                    }
                });
            });
        }
    }, [graphData, publicUrl, router]);


    useEffect(() => {
        const updateHeight = () => {
            setGraphHeight(Math.max(GRAPH_MIN_HEIGHT, window.innerHeight - GRAPH_HEIGHT_OFFSET));
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    if (agents.length === 0) {
        return <div className="flex justify-center py-12 text-gray-500">No agents to show in graph.</div>;
    }
    
    const getDownloadButtonClassName = (isEnabled: boolean): string =>
    [
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        isEnabled
            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
    ].join(' ');

    const handleDownloadPng = useCallback(async () => {
        if (!network) return;
        const canvas = network.canvas.frame.canvas;
        canvas.toBlob((blob) => {
            if (blob) {
                triggerBlobDownload(blob, buildGraphFilename('png'));
            }
        });
    }, [network]);

    const handleDownloadSvg = useCallback(() => {
        if (!visJsRef.current) return;
        const svg = visJsRef.current.querySelector('svg');
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        triggerBlobDownload(blob, buildGraphFilename('svg'));
    }, []);

    const handleDownloadAscii = useCallback(() => {
        const ascii = graphData.links.map(link => `${link.source} -> ${link.target}`).join('\n');
        const blob = new Blob([ascii], { type: 'text/plain' });
        triggerBlobDownload(blob, buildGraphFilename('txt'));
    }, [graphData]);
    
    const toggleFilter = (type: ConnectionType) => {
        const newFilter = filterType.includes(type)
            ? filterType.filter(t => t !== type)
            : [...filterType, type];
        setFilterType(newFilter);
    };
    
    const selectServerAndAgent = (value: string) => {
        if (value === '') {
            setSelectedServerUrl(null);
            setSelectedAgentName(null);
            return;
        }

        if (value === 'ALL') {
            setSelectedServerUrl('ALL');
            setSelectedAgentName(null);
            return;
        }

        if (value.startsWith('SERVER:')) {
            const serverUrl = normalizeServerUrl(value.replace('SERVER:', ''));
            setSelectedServerUrl(serverUrl);
            setSelectedAgentName(null);
            return;
        }

        const [serverUrl, agentName] = value.split('|');
        const normalizedServerUrl = normalizeServerUrl(serverUrl || '');
        setSelectedServerUrl(normalizedServerUrl);
        setSelectedAgentName(agentName || null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Show connections:</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('inheritance')}
                                onChange={() => toggleFilter('inheritance')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Parent</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('import')}
                                onChange={() => toggleFilter('import')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Import</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterType.includes('team')}
                                onChange={() => toggleFilter('team')}
                                className="rounded text-blue-600"
                            />
                            <span className="text-sm">Team</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Filter:</span>
                        <select
                            value={
                                selectedAgentName
                                    ? `${selectedServerUrl}|${selectedAgentName}`
                                    : selectedServerUrl === 'ALL'
                                    ? 'ALL'
                                    : selectedServerUrl
                                    ? `SERVER:${selectedServerUrl}`
                                    : ''
                            }
                            onChange={(event) => selectServerAndAgent(event.target.value)}
                            className="text-sm border rounded-md p-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Agents</option>
                            <optgroup label="This Server">
                                <option value={`SERVER:${normalizedPublicUrl}`}>Entire This Server</option>
                                {agents.map((agent) => (
                                    <option key={agent.agentName} value={`${normalizedPublicUrl}|${agent.agentName}`}>
                                        {agent.meta.fullname || agent.agentName}
                                    </option>
                                ))}
                            </optgroup>
                            {Object.entries(federatedServersStatus).map(([serverUrl, status]) => (
                                <optgroup
                                    key={serverUrl}
                                    label={
                                        serverUrl.replace(/^https?:\/\//, '') +
                                        (status.status === 'loading'
                                            ? ' (loading...)'
                                            : status.status === 'error'
                                            ? ' (error)'
                                            : '')
                                    }
                                >
                                    <option value={`SERVER:${serverUrl}`}>Entire Server</option>
                                    {federatedAgents
                                        .filter((agent) => agent.serverUrl === serverUrl)
                                        .map((agent) => (
                                            <option key={agent.agentName} value={`${serverUrl}|${agent.agentName}`}>
                                                {agent.meta.fullname || agent.agentName}
                                            </option>
                                        ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {(selectedAgentName || selectedServerUrl) && (
                        <button
                            type="button"
                            onClick={() => selectServerAndAgent('')}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Clear focus
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <span className="text-xs font-medium text-slate-500">Download:</span>
                    <button
                        type="button"
                        onClick={handleDownloadPng}
                        disabled={!network}
                        className={getDownloadButtonClassName(!!network)}
                        title="Download graph as PNG"
                    >
                        <FileImage className="w-4 h-4" />
                        PNG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        disabled={!network}
                        className={getDownloadButtonClassName(!!network)}
                        title="Download graph as SVG"
                    >
                        <Code className="w-4 h-4" />
                        SVG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadAscii}
                        disabled={!network}
                        className={getDownloadButtonClassName(!!network)}
                        title="Download graph as ASCII"
                    >
                        <FileText className="w-4 h-4" />
                        ASCII
                    </button>
                </div>
            </div>
             <div ref={visJsRef} style={{ height: graphHeight, border: '1px solid lightgray', background: '#f8fafc'  }} />
        </div>
    );
}
