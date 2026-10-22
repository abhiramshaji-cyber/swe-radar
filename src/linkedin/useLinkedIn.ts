import { useEffect, useState } from "react";
import type { LinkedInState } from "../../electron/linkedin/queue";

const OUT: LinkedInState = { signedIn: false, verdicts: {} };

export function useLinkedIn() {
  const [state, setState] = useState<LinkedInState>(OUT);
  useEffect(() => {
    window.radar.linkedIn().then(setState, () => {});
    return window.radar.onLinkedIn(setState);
  }, []);
  return state;
}
