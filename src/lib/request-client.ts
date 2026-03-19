import { collection, addDoc, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";

/**
 * Submits a request to the _requests collection and waits for the
 * Firestore trigger (`processRequests`) to process it.
 * Returns the result or throws with the error message.
 */
export async function submitRequest(
  type: string,
  data: Record<string, any>,
  userId: string,
  timeoutMs = 30000
): Promise<Record<string, any>> {
  const docRef = await addDoc(collection(db, "_requests"), {
    type,
    data,
    userId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("Request timed out. Please try again."));
    }, timeoutMs);

    const unsubscribe = onSnapshot(
      doc(db, "_requests", docRef.id),
      (snap) => {
        const d = snap.data();
        if (!d) return;

        if (d.status === "completed") {
          clearTimeout(timer);
          unsubscribe();
          resolve(d.result || {});
        } else if (d.status === "error") {
          clearTimeout(timer);
          unsubscribe();
          reject(new Error(d.error || "Request failed"));
        }
      },
      (err) => {
        clearTimeout(timer);
        unsubscribe();
        reject(err);
      }
    );
  });
}
