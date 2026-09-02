import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { CONVERGE_LOGO_BASE64 } from "./email/converge-logo";

/**
 * Serves the Converge logo as a public image. Google Chat cards can only show
 * an image by URL (they can't embed bytes like email's CID), and that URL must
 * be fetchable by Google's servers without a token — hence @Public. Serving it
 * from the backend means the logo doesn't depend on the frontend being
 * deployed or on FRONTEND_URL pointing anywhere in particular.
 */
@Controller("branding")
export class BrandingController {
  private readonly logo = Buffer.from(CONVERGE_LOGO_BASE64, "base64");

  @Public()
  @Get("logo.png")
  getLogo(@Res() res: Response) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(this.logo);
  }
}
