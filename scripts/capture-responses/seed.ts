import { loadEnvironment } from "./libs/env";
import { connect } from "./database/mongo";
import { Entity } from "./database/schemas/entities";
import { User } from "./database/schemas/users";
import { Membership } from "./database/schemas/memberships";
import { hash } from "./libs/crypto";

loadEnvironment();

/**
 * Creates the smallest account that can exercise the documented endpoints: one
 * entity and one property manager inside it. A platform admin is deliberately
 * avoided, since admin logins require two-factor setup and admins hold no
 * entity of their own.
 */
async function main() {
  await connect();

  const now = Date.now();
  const password = hash(`${process.env.SEED_SECRET || ""}Aa1!`);

  const entity = await Entity.findOneAndUpdate(
    { entityName: "Example Company" },
    {
      entityType: "company",
      entityName: "Example Company",
      country: "US",
      status: "active",
      lastUpdated: now,
    },
    { upsert: true, new: true },
  );

  const user = await User.findOneAndUpdate(
    { email: "owner@example.com" },
    {
      name: "Alex",
      surname: "Rivera",
      email: "owner@example.com",
      password,
      active: true,
      emailVerified: true,
      role: "user",
      entity: entity._id.toString(),
      refreshTokens: [],
      lastUpdated: now,
    },
    { upsert: true, new: true },
  );

  await Membership.findOneAndUpdate(
    { userId: user._id.toString(), entityId: entity._id.toString() },
    {
      userId: user._id.toString(),
      entityId: entity._id.toString(),
      entityRole: "property_manager",
      propertyAccess: "all",
      allowedPropertyIds: [],
      lastUpdated: now,
    },
    { upsert: true, new: true },
  );

  console.log(JSON.stringify({ entityId: entity._id.toString(), userId: user._id.toString() }));
  process.exit(0);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
