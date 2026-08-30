"""Génère le profil iOS (web clip) pour installer Klir IA sans App Store."""
from __future__ import annotations

import base64
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / "public" / "icons" / "apple-touch-icon.png"
OUT = ROOT / "public" / "downloads" / "klir-ia.mobileconfig"


def main() -> None:
    icon_b64 = base64.b64encode(ICON.read_bytes()).decode("ascii")
    clip_uuid = str(uuid.uuid4()).upper()
    payload_uuid = str(uuid.uuid4()).upper()
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data>{icon_b64}</data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>Klir IA</string>
      <key>PayloadDescription</key>
      <string>Installe Klir IA sur l'écran d'accueil (sans App Store).</string>
      <key>PayloadDisplayName</key>
      <string>Klir IA</string>
      <key>PayloadIdentifier</key>
      <string>io.klirline.webclip</string>
      <key>PayloadOrganization</key>
      <string>Klirline Inc.</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>{clip_uuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>https://klirline.io/?source=ios</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Raccourci application Klir IA</string>
  <key>PayloadDisplayName</key>
  <string>Klir IA</string>
  <key>PayloadIdentifier</key>
  <string>io.klirline.install</string>
  <key>PayloadOrganization</key>
  <string>Klirline Inc.</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>{payload_uuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(xml, encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
