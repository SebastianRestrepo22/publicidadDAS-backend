import { initDatabase } from "./initDatabase.js";

// Usar en tu aplicación principal
export const initRolesAndAdmin = async () => {
    await initDatabase();
};