import { describe, expect, it } from "vitest";
import { subjectCandidate } from "~/components/keeper/keeperSubject";
import { pickFacts } from "~/services/keeper/knowledge.server";

describe("subjectCandidate", () => {
  it("finds the name in a station named for someone", () => {
    expect(subjectCandidate("Mohanlal hits")).toBe("Mohanlal");
    expect(subjectCandidate("Yesudas Songs Radio")).toBe("Yesudas");
    expect(subjectCandidate("KJ Yesudas Evergreen Hits")).toBe("KJ Yesudas");
    expect(subjectCandidate("Ilayaraja Melodies 24x7")).toBe("Ilayaraja");
  });
  it("skips the place and the language the station already names", () => {
    expect(subjectCandidate("Kerala Malayalam Radio", ["India", "Kerala"])).toBeNull();
    expect(subjectCandidate("Radio Kochi", ["Kochi"])).toBeNull();
  });
  it("offers nothing for acronyms, digits and long strings", () => {
    expect(subjectCandidate("BBC")).toBeNull();
    expect(subjectCandidate("Radio 101")).toBeNull();
    expect(subjectCandidate("Super Duper Mega Long Station Name Here")).toBeNull();
    expect(subjectCandidate("Live Radio FM")).toBeNull();
  });
});

describe("pickFacts", () => {
  const extract =
    "Mohanlal is an Indian actor who works in Malayalam cinema. He has a prolific career spanning over four decades, during which he has acted in more than 400 films. " +
    "He likes tea. The Government of India honoured him with Padma Shri in 2001 and Padma Bhushan in 2019 for his contributions to cinema. " +
    "In 2009, he became the first actor in India to be awarded the honorary rank of lieutenant colonel in the Territorial Army.";
  it("lifts numbered, notable sentences in article order and skips the lead", () => {
    const facts = pickFacts(extract, "Mohanlal is an Indian actor who works in Malayalam cinema.");
    expect(facts).toHaveLength(3);
    expect(facts[0]).toContain("400 films");
    expect(facts.join(" ")).not.toContain("likes tea");
    expect(facts.join(" ")).not.toContain("works in Malayalam cinema");
  });
});

import { titlePlace } from "~/utils/titlePlace";

describe("titlePlace", () => {
  it("capitalises a place spelled all in lower case, and leaves cased names alone", () => {
    expect(titlePlace("kerala")).toBe("Kerala");
    expect(titlePlace("new york")).toBe("New York");
    expect(titlePlace("saint-denis")).toBe("Saint-Denis");
    expect(titlePlace("São Paulo")).toBe("São Paulo");
    expect(titlePlace("McAllen")).toBe("McAllen");
    expect(titlePlace("")).toBe("");
  });
});
