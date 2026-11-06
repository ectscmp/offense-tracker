import "server-only";
import * as localStore from "@/lib/db-local";
import * as mongoStore from "./db";

/**
 * Data-store switch.
 *
 * Development defaults to the JSON store in `web/.data/dev-db.json`, so no
 * MongoDB connection is opened. Set `DEV_STORE=mongo` to use Mongo while
 * developing. Production always uses Mongo; the local store also refuses to
 * run outside development.
 */
export function isLocalStoreEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_STORE?.trim().toLowerCase() !== "mongo"
  );
}

type StoreApi = Omit<typeof mongoStore, "teacherDisplayName" | "studentName">;

const store: StoreApi = isLocalStoreEnabled() ? localStore : mongoStore;

export const pingDatabase = store.pingDatabase;
export const ensureTeacher = store.ensureTeacher;
export const getClasses = store.getClasses;
export const getArchivedClasses = store.getArchivedClasses;
export const getClass = store.getClass;
export const getSelectedClass = store.getSelectedClass;
export const selectClass = store.selectClass;
export const createClass = store.createClass;
export const updateClass = store.updateClass;
export const archiveClass = store.archiveClass;
export const restoreClass = store.restoreClass;
export const deleteClass = store.deleteClass;
export const getClassCounts = store.getClassCounts;
export const getRoster = store.getRoster;
export const getDashboard = store.getDashboard;
export const getBehaviors = store.getBehaviors;
export const getSettings = store.getSettings;
export const isStudentInClass = store.isStudentInClass;
export const getStudentClass = store.getStudentClass;
export const createIncident = store.createIncident;
export const addStudentsBulk = store.addStudentsBulk;
export const addStudent = store.addStudent;
export const getStudent = store.getStudent;
export const updateStudent = store.updateStudent;
export const removeStudentFromClass = store.removeStudentFromClass;
export const resolveScannedStudent = store.resolveScannedStudent;
export const getStudentHistory = store.getStudentHistory;
export const getReport = store.getReport;
export const getStats = store.getStats;
