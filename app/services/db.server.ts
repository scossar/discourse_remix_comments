import { PrismaClient } from "@prisma/client";

import { singleton } from "~/services/singleton.server";

export const db = singleton("prisma", () => new PrismaClient());
