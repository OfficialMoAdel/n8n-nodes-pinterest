// Board operations index file
// Individual operation files implemented in task 9
// Bulk operations implemented in task 16

export * from './create.operation';
export * from './get.operation';
export * from './update.operation';
export * from './delete.operation';
export { bulkGetBoards, bulkUpdateBoards, bulkDeleteBoards } from './bulk.operation';
