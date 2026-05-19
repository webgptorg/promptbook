/**
 * Internal representation of a socket response payload.
 *
 * @private internal utility of `startRemoteServer`
 */
export type SocketResponse<TPayload> = {
    readonly eventName: string;
    readonly payload: TPayload;
};

