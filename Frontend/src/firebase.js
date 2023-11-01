// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  doc,
  getDoc,
  arrayUnion,
  query,
  where,
  arrayRemove,
} from "firebase/firestore"

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const storage = getStorage(app)
export const db = getFirestore(app)
export const auth = getAuth(app)

export async function uploadProjectImage(projId, image) {
  const imageRef = ref(storage, `projects/${projId}`)
  await uploadBytes(imageRef, image)
  const url = await getDownloadURL(imageRef)
  return url
}

// projects
export async function createProject({
  title,
  description,
  meetLocation,
  maxMembers,
  image,
  ownerId,
  meetType,
  startDate,
}) {
  const docRef = await addDoc(collection(db, "projects"), {
    title: title,
    description: description,
    meetLocation: meetLocation,
    maxMembers: maxMembers,
    createdAt: serverTimestamp(),
    ownerId: ownerId,
    members: [],
    requestants: [],
    meetType: meetType,
    startDate: startDate,
  })

  const url = await uploadProjectImage(docRef.id, image)
  await updateDoc(docRef, {
    imageUrl: url,
  })
}

export async function createProjectJoinRequest({
  projectId,
  requestantId,
  ownerId,
  message,
  projectTitle,
  imageUrl,
}) {
  const projectRef = doc(db, "projects", projectId)
  await updateDoc(projectRef, {
    requestants: arrayUnion(requestantId),
  })

  const requestRef = await addDoc(collection(db, "requests"), {
    requestantId: requestantId,
    projectId: projectId,
    status: "pending",
    ownerId: ownerId,
    message: message,
    createdAt: serverTimestamp(),
    projectTitle: projectTitle,
    imageUrl: imageUrl,
  })

  return requestRef
}

export async function getAllProjects() {
  const snapshot = await getDocs(collection(db, "projects"))
  console.log("getting projects")

  let docData = []
  snapshot.forEach((doc) => {
    docData = [...docData, { id: doc.id, ...doc.data() }]
  })
  return docData
}

export async function getProjectById(id) {
  if (id === "") return
  const docSnapshot = await getDoc(doc(db, "projects", id))
  docSnapshot.data()
  console.log(docSnapshot.id)

  if (!docSnapshot.exists()) throw new Error("project does not exists")
  return {
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }
}

export async function getProjectsByUserId(userId) {
  if (userId.length < 1) return
  const projsRef = collection(db, "projects")
  const q = query(projsRef, where("ownerId", "==", userId))
  const qSnapShot = await getDocs(q)

  let queryData = []
  qSnapShot.forEach((doc) => {
    queryData = [...queryData, { id: doc.id, ...doc.data() }]
  })

  return queryData
}

// requests
export async function getAllPendingRequests(currentUserId) {
  const requestsRef = collection(db, "requests")
  const q = query(
    requestsRef,
    where("ownerId", "==", currentUserId),
    where("status", "==", "pending")
  )

  const qSnapShot = await getDocs(q)

  let queryData = []
  qSnapShot.forEach((doc) => {
    queryData = [...queryData, { id: doc.id, ...doc.data() }]
  })

  return queryData
}

export async function acceptRequest(requestId, projectId, requestantId) {
  await updateDoc(doc(db, "requests", requestId), {
    status: "accepted",
  })

  await updateDoc(doc(db, "projects", projectId), {
    members: arrayUnion(requestantId),
    requestants: arrayRemove(requestantId),
  })

  console.log("success")
}

function addIdToSnapShot(snapshot) {
  let queryData = []
  snapshot.forEach((doc) => {
    queryData = [...queryData, { id: doc.id, ...doc.data() }]
  })

  return queryData
}
// project posts
export async function getAllProjectPosts(projectId) {
  const projPostsSnap = await getDocs(
    collection(db, `projects/${projectId}/posts`)
  )

  return addIdToSnapShot(projPostsSnap)
}
export async function createProjectPost(projectId, post) {
  console.log(projectId, post)
  await addDoc(collection(db, `projects/${projectId}/posts`), {
    title: post.title,
    comment: post.comment,
    likes: 0,
    createdAt: serverTimestamp(),
  })
}

export async function getProjectPostById(projectId, projectPostId) {
  const postSnapShot = await getDoc(
    doc(db, `projects/${projectId}/posts/${projectPostId}`)
  )
  return {
    id: postSnapShot.id,
    ...postSnapShot.data(),
  }
}

// auth
export function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signInWithClerkToken(token) {
  return signInWithCustomToken(auth, token)
}

export function signOutFromFirebase() {
  return signOut(auth)
}
