# Asset licensing

Every entry in `assets.json` records its source and license. The initial photo
pool was obtained from Lorem Picsum or directly from Unsplash and is distributed
under the [Unsplash License](https://unsplash.com/license).

The five locally derived landing-demo images retain the source license of their
inputs. The two locally typeset poster scenes are test fixtures created for
Lumilio Photos and are marked as project-generated in the catalog.

Before adding an asset, confirm that redistribution is permitted, add its source
and license fields, and run `node scripts/verify.mjs`. Do not replace an existing
asset in place; add a new stable ID and explicitly update the relevant profile.

