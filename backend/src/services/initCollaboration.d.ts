import type http from 'http';

declare function initCollaborationService(server: http.Server): any;
declare function getCollaborationService(): any;

export { initCollaborationService, getCollaborationService };
