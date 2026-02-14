import { describe, expect, it } from "vitest";
import {
  onboardingRiotIdSchema,
  onboardingProfileSchema,
  queueTypeSchema,
  joinQueueSchema,
  addFriendSchema,
  sendFriendMessageSchema,
  markReadFriendSchema,
} from "./schemas";

describe("schemas", () => {
  describe("onboardingRiotIdSchema", () => {
    it("aceita riotId e tagline em dois campos", () => {
      const r = onboardingRiotIdSchema.safeParse({ riotId: "Player", tagline: "BR1" });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.riotId).toBe("Player");
        expect(r.data.tagline).toBe("BR1");
      }
    });

    it("rejeita riotId vazio", () => {
      const r = onboardingRiotIdSchema.safeParse({ riotId: "", tagline: "BR1" });
      expect(r.success).toBe(false);
    });

    it("rejeita tagline vazio", () => {
      const r = onboardingRiotIdSchema.safeParse({ riotId: "Player", tagline: "" });
      expect(r.success).toBe(false);
    });

    it("rejeita nome com menos de 2 caracteres", () => {
      const r = onboardingRiotIdSchema.safeParse({ riotId: "A", tagline: "BR1" });
      expect(r.success).toBe(false);
    });
  });

  describe("onboardingProfileSchema", () => {
    it("aceita nome, username e CPF válidos", () => {
      const r = onboardingProfileSchema.safeParse({
        name: "Jean",
        username: "jean_01",
        cpf: "52998224725",
      });
      expect(r.success).toBe(true);
    });

    it("rejeita username com caracteres inválidos", () => {
      const r = onboardingProfileSchema.safeParse({ name: "Jean", username: "jean-01" });
      expect(r.success).toBe(false);
    });
  });

  describe("queueTypeSchema", () => {
    it("aceita low_elo, mid_elo, high_elo, inclusive", () => {
      expect(queueTypeSchema.safeParse("low_elo").success).toBe(true);
      expect(queueTypeSchema.safeParse("mid_elo").success).toBe(true);
      expect(queueTypeSchema.safeParse("high_elo").success).toBe(true);
      expect(queueTypeSchema.safeParse("inclusive").success).toBe(true);
    });

    it("rejeita valor inválido", () => {
      expect(queueTypeSchema.safeParse("ranked").success).toBe(false);
    });
  });

  describe("joinQueueSchema", () => {
    it("aceita queue_type válido", () => {
      const r = joinQueueSchema.safeParse({ queue_type: "high_elo" });
      expect(r.success).toBe(true);
    });
  });

  describe("addFriendSchema", () => {
    it("exige username ou friend_id", () => {
      expect(addFriendSchema.safeParse({}).success).toBe(false);
      expect(addFriendSchema.safeParse({ username: "alice" }).success).toBe(true);
      expect(addFriendSchema.safeParse({ friend_id: "cuid123" }).success).toBe(true);
    });
  });

  describe("sendFriendMessageSchema", () => {
    it("aceita receiver_id e content", () => {
      const r = sendFriendMessageSchema.safeParse({
        receiver_id: "user-id",
        content: "Olá",
      });
      expect(r.success).toBe(true);
    });

    it("rejeita content vazio", () => {
      expect(
        sendFriendMessageSchema.safeParse({ receiver_id: "id", content: "   " }).success
      ).toBe(false);
    });
  });

  describe("markReadFriendSchema", () => {
    it("aceita friend_id", () => {
      expect(markReadFriendSchema.safeParse({ friend_id: "cuid" }).success).toBe(true);
    });
  });
});
