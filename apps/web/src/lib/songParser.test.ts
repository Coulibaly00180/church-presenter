import { describe, it, expect } from "vitest"
import { parseSongText } from "./songParser"

describe("parseSongText", () => {
  it("retourne null pour un texte vide", () => {
    expect(parseSongText("")).toBeNull()
    expect(parseSongText("   \n  \n  ")).toBeNull()
  })

  it("parse un titre seul sans blocs structurés → fallback mono-bloc VERSE", () => {
    // Pas de ligne vide entre titre et contenu → pas d'auteur détecté, tout reste en contenu
    const text = "Amazing Grace\n\nHow sweet the sound\nThat saved a wretch like me"
    const result = parseSongText(text)
    expect(result).not.toBeNull()
    expect(result!.title).toBe("Amazing Grace")
    expect(result!.blocks).toHaveLength(1)
    expect(result!.blocks[0].type).toBe("VERSE")
    expect(result!.blocks[0].content).toContain("How sweet the sound")
  })

  it("parse titre + auteur + blocs structurés", () => {
    const text = [
      "10 000 Reasons",
      "Matt Redman",
      "",
      "COUPLET 1",
      "Bless the Lord oh my soul",
      "Oh my soul",
      "",
      "REFRAIN",
      "10 000 reasons for my heart to find",
    ].join("\n")

    const result = parseSongText(text)
    expect(result!.title).toBe("10 000 Reasons")
    expect(result!.artist).toBe("Matt Redman")
    expect(result!.blocks).toHaveLength(2)
    expect(result!.blocks[0].type).toBe("VERSE")
    expect(result!.blocks[0].content).toBe("Bless the Lord oh my soul\nOh my soul")
    expect(result!.blocks[1].type).toBe("CHORUS")
    expect(result!.blocks[1].content).toBe("10 000 reasons for my heart to find")
  })

  it("détecte CHORUS pour le mot-clé CHORUS (anglais)", () => {
    const text = "Song\n\nCHORUS\nThis is the chorus"
    const result = parseSongText(text)
    expect(result!.blocks[0].type).toBe("CHORUS")
  })

  it("détecte BRIDGE", () => {
    const text = "Song\n\nBRIDGE\nBridge lyrics"
    const result = parseSongText(text)
    expect(result!.blocks[0].type).toBe("BRIDGE")
  })

  it("détecte INTRO et OUTRO", () => {
    const text = "Song\n\nINTRO\nIntro text\n\nOUTRO\nOutro text"
    const result = parseSongText(text)
    expect(result!.blocks[0].type).toBe("INTRO")
    expect(result!.blocks[1].type).toBe("OUTRO")
  })

  it("assigne des orders croissants aux blocs", () => {
    const text = [
      "Song",
      "",
      "VERSE",
      "v1",
      "",
      "CHORUS",
      "c1",
      "",
      "VERSE",
      "v2",
    ].join("\n")

    const result = parseSongText(text)
    expect(result!.blocks.map((b) => b.order)).toEqual([0, 1, 2])
  })

  it("ignore les blocs entièrement vides", () => {
    const text = "Song\n\nVERSE\n\nCHORUS\nHello"
    const result = parseSongText(text)
    // Le bloc VERSE vide est ignoré, seul le CHORUS avec contenu est conservé
    expect(result!.blocks.every((b) => b.content.trim().length > 0)).toBe(true)
  })

  it("gère les fins de ligne Windows CRLF", () => {
    const text = "Song\r\nAuthor\r\n\r\nVERSE\r\nLine one\r\nLine two"
    const result = parseSongText(text)
    expect(result!.title).toBe("Song")
    expect(result!.blocks[0].content).toContain("Line one")
  })

  it("parse sans auteur quand la 2ème ligne est un header de bloc", () => {
    const text = "Song\n\nCHORUS\nHello world"
    const result = parseSongText(text)
    expect(result!.title).toBe("Song")
    expect(result!.artist).toBeUndefined()
    expect(result!.blocks[0].type).toBe("CHORUS")
  })
})
