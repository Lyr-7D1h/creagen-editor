# Controller

The controller lets you tweak your sketch from a second device, usually your phone, while the editor stays open on your main screen.

## What It Does

1. Open a sketch that has parameters.
2. Scan the QR code shown in the editor.
3. The phone opens a controller page with your sketch controls.
4. Any change you make on phone updates the sketch in the editor.

## Use Controller With QR

### Before You Start

- Turn on Enable controller in settings.
- Turn on Show QR in settings.
- Use a sketch that actually has parameters.

If there are no sketch params, no QR is shown.

### Steps

1. Open the editor and load a sketch with params.
2. In settings, enable Controller.
3. In settings, enable Show QR. Or use the top bar in the editor where you can see a small qr icon which allows you to enable/disable the QR.
4. Scan the QR shown in the bottom-right of the editor.
5. On mobile, the controller page opens with the same param controls.
6. Change values on mobile; the editor updates immediately.

> [!NOTE]
> If "Auto render" is not enabled in the [Parameters](./parameters.md) then it will not run the code with the changed parameters it will only update it in the panel.

## Change Parameters From The Controller

The controller page shows the same controls you see in the editor's parameter panel.

- Move sliders and toggles to update individual values.
- Use Randomize all to quickly explore new variations.
- Use Reset to defaults to return to the original setup.
- Use regeneration interval if you want automatic periodic re-randomization.

In the editor:

- Values update immediately.
- If Auto render is enabled, each change re-renders automatically.
