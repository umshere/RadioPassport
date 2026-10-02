import { useEffect, useState } from "react";
import type { KeeperFacts } from "./keeperFacts";
import { findSubject } from "./keeperClient";
import type { StationSubject } from "./keeperSubject";

/**
 * The person or group a station is named for ("Mohanlal Hits"), once
 * Wikipedia has confirmed there is one. Null while it looks, or when there
 * is none; the desk simply offers nothing extra.
 */
export function useStationSubject(facts: KeeperFacts | null, enabled: boolean): StationSubject | null {
  const [found, setFound] = useState<{ key: string; subject: StationSubject | null } | null>(null);
  const key = facts ? `${facts.station.name}|${facts.station.country}|${facts.city}` : "";
  useEffect(() => {
    if (!facts || !enabled) return;
    let current = true;
    void findSubject({ name: facts.station.name, country: facts.station.country, city: facts.city }).then((subject) => {
      if (current) setFound({ key, subject });
    });
    return () => {
      current = false;
    };
    // facts changes on every track; the station identity (key) is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return found && found.key === key ? found.subject : null;
}
