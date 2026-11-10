"""Curated design briefs. No Cartesian colour/size multiplication is counted.
Run bundled Python to write machine-readable production inventory.
"""
import json,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
THEMES={'C':'calm-oak','W':'walnut-form','J':'soft-japandi','I':'city-loft','L':'coastal-linen'}
DESIGNS=[]
def add(room,theme,slug,name,builder,form,why,**p):
 DESIGNS.append({'designId':'ois.design.'+slug,'familyId':'ois.family.'+slug,'id':'ois.design.'+slug,'name':name,'roomTags':[room],
 'theme':THEMES[theme],'builder':builder,'parameters':{'form':form,**p},'distinction':why,'stage':'planned','countEligible':True,
 'variants':[],'variantOf':None,'source':'scripts/design_geometry.py','licence':'LicenseRef-OIS-Original-Project',
 'provenance':{'kind':'original-procedural','authoring':'Codex for OIS Designs','thirdPartyGeometry':False,'thirdPartyTextures':False,'publicAssetLicence':'not separately granted'}})

# Living: seating construction, occasional tables, storage and lighting.
add('living','C','rail-frame-sofa','Exposed rail sofa','seating','rail-sofa','Visible timber arm rails and uprights instead of upholstered box arms.',w=2.12)
add('living','W','rolled-tuft-sofa','Rolled tuft sofa','seating','chester','Continuous cylindrical rolled arms and deep buttoned back.',w=2.20)
add('living','J','curved-seven-sofa','Crescent modular sofa','seating','curved-sofa','Seven radial modules form a concave seat/back silhouette.',w=2.10)
add('living','L','chaise-return-sofa','Chaise return sofa','seating','chaise-sectional','Integrated forward chaise with a separate support structure.',w=2.25)
add('living','I','corner-wrap-sofa','Corner wrap sectional','seating','corner-sectional','L-plan chaise with a full return back, not a mirrored straight sofa.',w=2.30,base='sled')
add('living','W','camelback-sofa','Camelback sofa','seating','camelback','Back height follows a raised central camelback profile.',w=2.08)
add('living','J','hinged-futon','Timber folding futon','seating','futon','Inclined continuous folding back with exposed hinge rails.',w=1.95)
add('living','C','bolster-daybed','Bolster daybed','seating','daybed','Backless upholstered deck with two cylindrical end bolsters.',w=2.04)
add('living','I','armless-modules','Armless modular sofa','seating','armless-modular','Independent cushions on a low sled base with no enclosing arms.',w=2.05,base='sled')
for t,slug,name,form,why,kw in [
 ('J','tension-sling-chair','Ash tension sling','sling','Tensioned rising fabric sling on exposed leaning frame.',{}),
 ('W','wing-reading-chair','Wing reading chair','wing','High padded back with projecting side wings and armrests.',{'h':1.12}),
 ('L','woven-bow-chair','Spindle bow chair','windsor','Bent bow and seven turned back spindles over a timber seat.',{'w':.60,'d':.58,'h':.98}),
 ('I','wire-lounge','Wire lattice lounge','wire-chair','Open tubular seat/back ribs and narrow cushion on cantilever rails.',{}),
 ('C','timber-rocker','Timber upholstered rocker','rocker','Two continuous curved rocking runners support the frame.',{'h':1.0}),
 ('W','reclining-lounge','Extended reclining lounge','recliner','Extended footrest and exposed linkage change the support/footprint.',{'h':1.02}),
 ('J','barrel-enclosure','Barrel lounge chair','barrel','Continuous curved enclosing barrel shell with open front.',{'w':.82,'d':.80,'h':.83}),
 ('L','petal-lounge','Petal lounge chair','petal','Curved shell with separate raised petal wings.',{'w':.80,'h':.92}),
 ('W','egg-swivel','Egg shell lounge','egg','Tapered high curved shell with a narrower crown.',{'w':.86,'d':.82,'h':1.12}),
 ('I','cantilever-lounge','Cantilever lounge chair','cantilever','Continuous metal side rails eliminate rear legs.',{'w':.70,'d':.78}),
 ('C','club-armchair','Upholstered club chair','club','Rectilinear upholstered back and separate rail-supported arms.',{'w':.80,'d':.82}),
 ('J','oval-floor-pouf','Oval floor pouf','pouf','Soft ellipsoidal floor form with equator seam and no rigid legs.',{'w':.78,'d':.64,'h':.31}),
 ('L','hinged-storage-ottoman','Hinged storage ottoman','storage-ottoman','Raised seat lid and enclosed storage case with a front pull.',{'w':.85,'d':.58,'h':.43}),
 ('I','sled-footstool','Sled frame footstool','footstool','Thin cushion sits above two continuous metal sled frames.',{'w':.68,'d':.46,'h':.35}),
 ('J','sculpted-hourglass','Hourglass side stool','hourglass-stool','Turned hourglass waist flares into broad seat and base.',{'w':.46,'d':.46,'h':.45})]:add('living',t,slug,name,'seating',form,why,**kw)
for t,slug,name,form,shape,why in [
 ('W','kidney-tripod','Kidney tripod table','tripod','kidney','Asymmetric kidney top over three radial legs.'),
 ('I','hex-hairpin','Hexagonal hairpin table','hairpin','hex','Six-sided top with four open bent-wire hairpin supports.'),
 ('J','round-drum-coffee','Fluted drum coffee table','drum','round','Circular top over a full-height fluted cylindrical pedestal.'),
 ('L','oval-trestle-coffee','Oval trestle coffee table','trestle','oval','Oval top with two braced A trestles and longitudinal stretcher.'),
 ('C','racetrack-panel-coffee','Racetrack panel table','panel','racetrack','Capsule top over two wide planar supports.'),
 ('I','cantilever-c-table','Cantilever C table','cantilever','rect','Offset plate column leaves an open side for sofa access.'),
 ('W','nested-oval-tables','Nesting oval tables','nested','oval','Two interlocking tops at different heights with independent supports.'),
 ('J','triangle-cone-table','Triangular cone table','cone','triangle','Triangular top and tapering central cone have different plan silhouettes.'),
 ('C','arch-side-table','Arch side table','arch','round','Circular top rests on two swept arch supports.')]:
 add('living',t,slug,name,'table',form,why,w=.65 if 'side' in slug or 'c-table' in slug else 1.08,d=.45 if 'side' in slug or 'c-table' in slug else .62,h=.54 if 'side' in slug or 'c-table' in slug else .39,shape=shape)
add('living','W','record-listening-console','Record listening console','special','record-console','Open record bays, angled LP sleeves, top turntable and platter.',w=1.45,d=.43,h=.70)
add('living','I','mantel-fireplace','Freestanding mantel fireplace','special','fireplace','Open firebox between mantel piers, projecting hearth and log grate.',w=1.20,d=.35,h=1.05)
add('living','L','aquarium-console','Aquarium console','special','aquarium-stand','Storage pedestal supports a raised four-wall glass tank.',w=1.0,d=.40,h=.70)
add('living','C','tv-media-pedestal','Television media stand','special','tv-stand','Screen and central mount above an enclosed low stand.',w=1.25,d=.40,h=.48)

# Bedroom: beds are construction differences, never sizes counted alone.
for t,slug,name,form,why in [
 ('J','floating-platform-bed','Floating platform bed','floating','Deeply inset support produces a projecting cantilever platform.'),
 ('C','spindle-head-bed','Spindle headboard bed','spindle','Turned head posts and individual open vertical spindles.'),
 ('L','cane-head-bed','Woven headboard bed','cane-head','Open woven panel framed by timber rails and stiles.'),
 ('W','sleigh-panel-bed','Sleigh panel bed','sleigh','Curved end uprights support substantial head and foot panels.'),
 ('C','channel-upholstered-bed','Channel headboard bed','channel-head','Nine broad upholstered headboard channels.'),
 ('W','tufted-headboard-bed','Tufted headboard bed','tufted-head','Continuous padded headboard with a geometric deep-button field.'),
 ('L','wing-headboard-bed','Wing headboard bed','wing-head','Headboard side wings project alongside the pillows.'),
 ('I','open-four-poster','Open four-poster bed','four-poster','Four full-height posts and open upper connecting rails.'),
 ('L','draped-canopy-bed','Draped canopy bed','curtain-canopy','Canopy frame includes four gathered floor-length curtains.'),
 ('J','slatted-low-bed','Slatted low bed','slat-head','Low platform with open flat headboard slats.'),
 ('C','captain-storage-bed','Captain storage bed','captain','Raised enclosed frame with four accessible drawer fronts.'),
 ('I','pullout-trundle-bed','Pullout trundle bed','trundle','Second independently framed mattress projects from below the main bed.')]:
 add('bedroom',t,slug,name,'bed',form,why,size='queen',platform=.30 if t=='J' else .38)
for t,slug,name,form,front,kw,why in [
 ('C','open-cubby-nightstand','Open cubby nightstand','open','slab',{'rows':2,'w':.48,'h':.53},'Open horizontal shelf bay without door panels.'),
 ('W','three-drawer-nightstand','Three drawer bedside chest','drawers','slab',{'rows':3,'w':.52,'h':.62},'Three shallow independent full-width drawers on tall tapered legs.'),
 ('J','tambour-bedside','Tambour bedside cabinet','tambour','slab',{'w':.50,'h':.55},'A continuous vertical-stave tambour front wraps the storage volume.'),
 ('L','cane-bedside','Cane bedside cupboard','doors','cane',{'doors':1,'w':.48,'h':.62},'One open woven cane door and recessed interior.'),
 ('I','sled-double-dresser','Sled double dresser','drawers','slab',{'cols':2,'rows':3,'w':1.45,'h':.83,'base':'sled'},'Six full-depth drawer fronts in two banks on exposed steel sleds.'),
 ('W','tall-lingerie-chest','Tall lingerie chest','drawers','slab',{'rows':7,'w':.55,'h':1.36},'Seven slim drawers make a tall vertical chest with raised base.'),
 ('C','shaker-wardrobe','Shaker wardrobe','wardrobe','shaker',{'w':1.12,'d':.60,'h':1.95},'Framed recessed doors enclose a hanging rail and top shelf.'),
 ('L','louvered-armoire','Louvered armoire','wardrobe','louvre',{'w':1.26,'d':.58,'h':1.88},'Ventilated overlapping louvres distinguish the full-height doors.'),
 ('I','mesh-clothes-cabinet','Mesh clothes cabinet','wardrobe','mesh',{'w':.95,'d':.58,'h':1.85,'base':'sled'},'Metal grid doors and exposed steel underframe surround hanging space.'),
 ('J','fold-down-dressing-case','Fold-down dressing cabinet','fold-down','slab',{'w':.85,'h':1.35},'Hinged horizontal writing/dressing leaf with diagonal stays.'),
 ('W','jewellery-bureau','Jewellery bureau','drawers','slab',{'rows':6,'cols':3,'w':.90,'h':1.04},'Eighteen small drawers for jewellery, rather than enlarged clothing drawers.')]:
 add('bedroom',t,slug,name,'case',form,why,front=front,**kw)
add('bedroom','W','cheval-dressing-mirror','Cheval dressing mirror','special','cheval','Large framed mirror is suspended between independent upright supports.',w=.65,d=.42,h=1.65)
add('bedroom','C','hanging-valet-stand','Dressing valet stand','special','valet','Shoulder-shaped coat hanger, trouser bar and floor support.',w=.52,d=.35,h=1.20)
add('bedroom','L','woven-dressing-screen','Woven dressing screen','special','screen','Three hinged cane panels form a folded freestanding divider.',w=1.50,d=.04,h=1.70,front='cane')
add('bedroom','J','quilt-rail','Quilt display rack','special','quilt-rack','Three parallel textile rails on two freestanding timber hoops.',w=.95,d=.40,h=.86)
add('bedroom','W','upholstered-dressing-stool','Saddle dressing stool','seating','saddle-stool','Oval saddle-shaped upholstered seat on four tapered legs.',w=.62,d=.40,h=.48)
add('bedroom','I','luggage-folding-rack','Folding luggage rack','special','luggage-rack','Crossed X legs carry four separate textile luggage straps.',w=.68,d=.45,h=.53)
add('bedroom','L','woven-linen-basket','Woven linen basket','special','woven-basket','Open oval wicker staves and horizontal woven bands.',w=.48,d=.36,h=.54)

# Dining: chair back constructions and top/support combinations are explicit design choices.
for t,slug,name,form,why,kw in [
 ('C','ladderback-dining','Ladderback dining chair','ladder','Three broad horizontal ladder rails between tall posts.',{}),
 ('L','crossback-dining','Cross-back dining chair','cross-back','Two diagonals make an open X back.',{}),
 ('W','fork-back-dining','Fork-back dining chair','wishbone','Forked central back rises into a continuous horseshoe rail.',{}),
 ('I','wire-dining','Wire dining chair','wire-chair','Wire seat and back grid with a small floating seat cushion.',{'w':.48,'d':.51,'h':.85}),
 ('J','shell-dining','Curved shell dining chair','shell','Thin continuous curved shell wraps behind a separate padded seat.',{'w':.54,'d':.54,'h':.82}),
 ('C','folding-dining','Folding dining chair','folding','Cross-braced folding leg mechanism beneath flat timber seat/back.',{'w':.46,'d':.50,'h':.84}),
 ('I','cantilever-dining','Cantilever dining chair','cantilever','Tubular continuous C frames support a padded back and seat.',{'w':.48,'d':.55,'h':.86}),
 ('W','spindle-dining','Spindle dining chair','spindle','Low bowed top rail and seven exposed timber spindles.',{'w':.50,'d':.50,'h':.84}),
 ('L','barrel-dining','Barrel dining chair','barrel','Low continuous curved barrel shell rather than separate back posts.',{'w':.57,'d':.56,'h':.80})]:add('dining',t,slug,name,'seating',form,why,w=kw.pop('w',.48),d=kw.pop('d',.51),h=kw.pop('h',.89),**kw)
for t,slug,name,form,shape,why in [
 ('C','rect-trestle-dining','Trestle dining table','trestle','rect','Twin A supports and stretcher under a rectangular family table.'),
 ('W','oval-dual-pedestal','Oval twin pedestal table','dual-disc','oval','Two disc feet and stems carry a wide oval top.'),
 ('J','round-cone-dining','Round cone dining table','cone','round','Circular top on one tapered conical timber base.'),
 ('L','racetrack-cross-dining','Racetrack crossed dining table','cross','racetrack','Capsule top bridges two crossed-leg frames.'),
 ('I','rect-sled-dining','Steel sled dining table','sled','rect','Slab top on two uninterrupted steel sleds.'),
 ('W','round-tulip-dining','Tulip dining table','tulip','round','Swept waist flares smoothly into a disc foot and upper cup.'),
 ('C','oval-panel-dining','Oval panel-leg dining table','panel','oval','Wide vertical timber panels support a thin oval top.'),
 ('J','rect-waterfall-dining','Waterfall dining table','waterfall','rect','Continuous top and full-depth end slabs make a portal silhouette.'),
 ('I','hex-cross-dining','Hexagonal crossed table','cross','hex','Six-sided top exposes the crossed steel frame from oblique views.'),
 ('L','round-tripod-dining','Round tripod dining table','tripod','round','Three radial solid timber legs below a round family top.'),
 ('W','racetrack-fluted-dining','Fluted pedestal dining table','drum','racetrack','Capsule top on a substantial cylindrical fluted drum.'),
 ('C','sawhorse-dining','Sawhorse dining table','sawhorse','rect','Two separate trestle horses support a removable top.')]:add('dining',t,slug,name,'table',form,why,w=1.65 if shape not in ('round','hex') else 1.18,d=.88 if shape not in ('round','hex') else 1.18,h=.75,shape=shape)
add('dining','L','cane-dining-sideboard','Cane dining sideboard','case','doors','Three wide woven doors on a low raised sideboard.',w=1.65,d=.43,h=.82,doors=3,front='cane')
add('dining','W','glass-display-hutch','Glazed display hutch','case','hutch','Lower glazed cabinet and raised open display hutch.',w=1.25,d=.43,h=1.18,front='glass')
add('dining','I','wine-diagonal-cabinet','Diagonal wine cabinet','case','wine-lattice','Diagonal X partitions form open wine storage cells.',w=.90,d=.36,h=1.08)
add('dining','W','bar-service-trolley','Bar service trolley','table','trolley','Two rolling trays, four casters and raised push handle.',w=.80,d=.42,h=.78,shape='rect')
add('dining','J','drum-bar-stool','Drum bar stool','seating','drum-stool','Full stave-sided timber drum forms the stool rather than legs.',w=.42,d=.42,h=.68)
add('dining','I','gaslift-counter-stool','Gas-lift counter stool','seating','stool-pedestal','Star base and gas-lift stem with upholstered raised back.',w=.46,d=.48,h=1.03,seat=.70)
add('dining','C','tripod-counter-stool','Tripod counter stool','seating','tripod-stool','Three visibly splayed radial legs and a separate square seat.',w=.42,d=.42,h=.68)
add('dining','W','tractor-counter-stool','Tractor saddle stool','seating','tractor-stool','Sculpted twin saddle lobes on solid four-leg support.',w=.45,d=.37,h=.70)
add('dining','L','plate-service-rack','Open plate dresser','kitchen','plate-rack','Raised open plate dividers above two horizontal storage ledges.',w=1.1,d=.30,h=.90)

# Kitchen cabinetry/appliances: functions and construction, not just door colours.
for t,slug,name,form,why,kw in [
 ('C','farmhouse-sink-base','Farmhouse sink base','farmhouse-sink','Projecting ceramic apron vessel on framed-door base.',{'w':.90}),
 ('I','steel-sink-island','Steel sink island','sink-island','Island counter incorporates a raised metal basin and faucet.',{'w':1.60,'d':.80}),
 ('W','butcher-drawer-island','Butcher block island','butcher-block','Thick solid timber block over two banks of three drawers.',{'w':1.25,'d':.75}),
 ('L','breakfast-overhang-island','Breakfast overhang island','breakfast-island','Deep cantilevered breakfast overhang along the seating side.',{'w':1.70,'d':.65,'front':'cane'}),
 ('J','open-prep-island','Open preparation island','open-island','Open timber frame and low shelf with no enclosed cabinets.',{'w':1.20,'d':.70}),
 ('C','corner-l-base','L corner base cabinet','corner-base','L-shaped return body fits a kitchen corner.',{'w':.90,'d':.60}),
 ('I','deep-drawer-base','Deep drawer base','drawer-base','Three full-width functional drawer banks.',{'w':.80}),
 ('W','tall-pullout-pantry','Pullout pantry tower','pullout-pantry','Basket rails and projecting full-height pullout face.',{'w':.45,'d':.60,'h':1.95}),
 ('J','slim-spice-pullout','Open spice pullout','spice-pullout','Low narrow open rack with three basket supports and pullout face.',{'w':.22,'d':.55,'h':.88}),
 ('L','glass-wall-cupboard','Glazed wall cupboard','glass-wall','Transparent framed panels reveal interior wall storage.',{'w':.85,'d':.32,'h':.75}),
 ('C','open-wall-cubby','Open wall cubby','open-wall','Three open display shelves in a short wall cabinet.',{'w':.75,'d':.30,'h':.72}),
 ('L','wall-plate-cupboard','Wall plate cupboard','wall-plate','Front plate spindles retain plates above enclosed storage.',{'w':.85,'d':.30,'h':.70}),
 ('W','rolling-appliance-garage','Rolling appliance garage','appliance-garage','Horizontal rolling tambour curtain above a counter opening.',{'w':.90,'d':.52,'h':.65}),
 ('I','open-pot-tower','Open pot tower','pot-rack','Four steel shelves and upper hanging pot hooks.',{'w':.80,'d':.45,'h':1.70}),
 ('L','bakers-prep-rack','Bakers preparation rack','bakers-rack','Worktop at mid-height with separate raised display shelves.',{'w':1.0,'d':.50,'h':1.65})]:add('kitchen',t,slug,name,'kitchen',form,why,**kw)
for t,slug,name,form,why,kw in [
 ('I','six-burner-range','Freestanding oven range','oven-range','Top burner rings, front controls and full glazed oven door.',{'w':.90,'h':.90,'steel':True}),
 ('C','double-wall-oven','Double wall oven','double-oven','Two stacked glazed oven cavities and independent handles.',{'w':.60,'h':1.20}),
 ('W','retro-two-door-fridge','Rounded retro refrigerator','retro-fridge','Rounded upper/lower doors and long vertical pull handles.',{'w':.68,'h':1.65}),
 ('I','french-door-fridge','French-door refrigerator','french-fridge','Split full-height doors plus a separate lower freezer drawer.',{'w':.90,'h':1.82,'steel':True}),
 ('J','wine-cooling-cabinet','Wine cooling cabinet','wine-fridge','Glazed door reveals horizontal bottle racks and bottle geometry.',{'w':.60,'h':.86}),
 ('L','integrated-dishwasher','Integrated dishwasher','dishwasher','Full-width pull door with top control strip and glazing inset.',{'w':.60,'h':.85}),
 ('I','chimney-rangehood','Chimney range hood','rangehood','Separate broad canopy, tall narrow flue and underside filter.',{'w':.90,'h':.90,'steel':True}),
 ('C','counter-microwave','Countertop microwave','microwave','Low horizontal glazed cavity and pull handle.',{'w':.52,'d':.40,'h':.32}),
 ('J','upright-freezer','Upright freezer','freezer','Single full-height insulated door and long external handle.',{'w':.65,'h':1.75})]:add('kitchen',t,slug,name,'appliance',form,why,**kw)
add('kitchen','C','kitchen-wall-pantry','Shaker pantry cabinet','case','doors','Three tall framed pantry doors; no open hanging rail.',w=1.35,d=.48,h=1.90,doors=3,front='shaker',base='plinth')
add('kitchen','I','metal-mesh-pantry','Mesh pantry cabinet','case','doors','Two wire-grid pantry doors on tall open steel sleds.',w=.85,d=.40,h=1.70,front='mesh',base='sled')
add('kitchen','J','utility-step-stool','Kitchen step stool','special','step-stool','Two reachable horizontal steps with open timber leg frame.',w=.46,d=.42,h=.50)

# Bathroom.
for t,slug,name,form,why,kw in [
 ('C','shaker-single-vanity','Shaker single vanity','single-vanity','Framed cupboard base, stone counter and hollow rectangular basin.',{'w':.85}),
 ('W','double-drawer-vanity','Double drawer vanity','double-vanity','Two hollow basins and faucets above two banks of drawers.',{'w':1.55,'d':.55}),
 ('J','vessel-top-console','Vessel console vanity','vessel-console','Oval raised vessel basin contrasts with a timber door console.',{'w':1.0}),
 ('I','steel-washstand','Open steel washstand','washstand','Open tubular support and towel shelf expose the basin underside.',{'w':.75}),
 ('L','floating-bath-drawers','Raised floating vanity','floating-vanity','Elevated two-drawer body with a measured raised underside.',{'w':.90}),
 ('C','ceramic-pedestal-basin','Pedestal wash basin','pedestal-sink','Turned ceramic pedestal below a hollow oval basin.',{}),
 ('W','clawfoot-bathtub','Clawfoot bathtub','claw-tub','Hollow oval tub raised on four discrete claw-like feet.',{}),
 ('J','oval-soaking-tub','Oval soaking tub','soaking-tub','Tall compact hollow soaking vessel with curved sides.',{'w':1.25,'d':.78,'h':.78}),
 ('I','rectilinear-bathtub','Rectilinear bathtub','rect-tub','Straight hollow tub walls and inset bottom form a rectangular volume.',{'w':1.70,'d':.78,'h':.58}),
 ('L','oval-floor-tub','Oval floor bathtub','oval-tub','Long low continuous hollow oval vessel without separate feet.',{'w':1.72,'d':.80,'h':.55}),
 ('C','close-coupled-toilet','Close-coupled toilet','toilet-close','Separate low cistern, curved bowl, seat ring and pedestal.',{}),
 ('I','wall-carrier-toilet','Wall-carrier toilet','toilet-wall','Compact carrier-backed bowl with no exposed tank.',{}),
 ('W','high-cistern-toilet','High cistern toilet','toilet-vintage','High wall cistern and exposed vertical flush pipe.',{}),
 ('J','freestanding-bidet','Freestanding bidet','bidet','Open wash bowl and individual faucet with no seat/cistern.',{}),
 ('I','framed-shower-cube','Framed shower enclosure','shower-square','Three glass screens, door handle, tray and overhead shower.',{'w':.90,'d':.90}),
 ('L','curved-track-shower','Curved track shower','shower-quadrant','Oval top track added to the screen structure; must pass near-duplicate review.',{'w':1.0,'d':1.0}),
 ('J','walkin-shower-screen','Walk-in shower screens','shower-walkin','Open entrance between two side screens with no front door.',{'w':1.20,'d':.90}),
 ('C','leaning-towel-ladder','Leaning towel ladder','towel-ladder','Five horizontal rungs between sloping solid timber stiles.',{}),
 ('W','tiered-towel-stand','Tiered towel stand','towel-stand','Three separate metal hoops rise at different heights.',{}),
 ('J','drain-slat-bath-stool','Slatted bath stool','bath-stool','Wide panel supports and a drain-slotted timber seat.',{}),
 ('L','three-basket-bath-caddy','Three basket bath caddy','bath-caddy','Three rimmed trays carried on a narrow freestanding frame.',{})]:add('bathroom',t,slug,name,'bath',form,why,**kw)
add('bathroom','L','cane-linen-tower','Cane linen tower','case','linen','Six separately woven cupboard cells rather than one large door.',w=.62,d=.34,h=1.60,rows=3,cols=2)
add('bathroom','C','bath-open-towel-shelf','Open towel shelf','case','open','Low open four-level shelf with no enclosed storage.',w=.55,d=.30,h=1.25,rows=4,base='plinth')
add('bathroom','I','vented-bath-locker','Vented bath locker','case','locker','Six ventilated louvre doors in two vertical banks.',w=.75,d=.35,h=1.65,rows=3,cols=2,base='sled')
add('bathroom','W','bath-pedal-hamper','Pedal laundry hamper','special','pedal-bin','Lift lid and projecting foot pedal on a timber hamper.',w=.45,d=.38,h=.58)

# Office: desks and independent working equipment.
for t,slug,name,form,shape,why,kw in [
 ('C','writing-drawer-desk','Two drawer writing desk','four-leg','rect','Two suspended drawers under a four-leg writing surface.',{'drawers':2}),
 ('I','steel-sled-workdesk','Steel sled work desk','sled','rect','Two continuous steel side frames carry the writing slab.',{}),
 ('J','waterfall-workdesk','Waterfall work desk','waterfall','rect','Full depth end slabs give a portal-like closed side silhouette.',{}),
 ('W','rolltop-pigeonhole-desk','Pigeonhole secretary desk','rolltop','rect','Raised rear pigeonholes and multiple small internal partitions.',{}),
 ('L','ladder-shelf-desk','Leaning ladder desk','ladder-desk','rect','Sloping tall side stiles carry two shelves above the writing surface.',{}),
 ('I','adjustable-workstation','Sit-stand workstation','sit-stand','rect','Telescoping columns, T feet and visible crossbeam.',{'h':1.02}),
 ('W','l-return-workdesk','L return desk','l-desk','rect','An actual perpendicular desk return with its own supporting legs.',{'w':1.45,'d':.65}),
 ('C','drafting-frame-table','Drafting frame table','drafting','rect','Tilted drawing board with A frame and angle stay.',{'h':.95}),
 ('J','oval-pedestal-desk','Oval pedestal desk','dual-disc','oval','Two disc-and-stem pedestals beneath an oval writing top.',{'w':1.50}),
 ('L','hairpin-writing-desk','Hairpin writing desk','hairpin','racetrack','Capsule-shaped writing top carried on narrow bent-wire hairpins.',{'w':1.35}),
 ('I','trestle-project-desk','Trestle project desk','trestle','rect','Cross-braced A supports leave a clear work surface.',{'w':1.60,'shelf':True}),
 ('W','kidney-executive-desk','Kidney executive desk','panel','kidney','Asymmetric kidney work surface on broad timber panels.',{'w':1.60,'d':.80})]:add('office',t,slug,name,'table',form,why,w=kw.pop('w',1.30),d=kw.pop('d',.65),h=kw.pop('h',.75),shape=shape,**kw)
add('office','I','ergonomic-task-chair','Five-star task chair','seating','task','Five casters, gas lift and separate back/arm supports.',w=.64,d=.64,h=1.05,seat=.47)
add('office','W','highback-executive-chair','High-back executive chair','seating','executive','Tall padded high back and raised arms on rolling star base.',w=.70,d=.70,h=1.25,seat=.49)
add('office','J','low-swivel-chair','Low swivel office chair','seating','swivel','Low upholstered back on a non-caster five-star base.',w=.62,d=.60,h=.86,seat=.44)
add('office','C','tablet-training-chair','Tablet training chair','seating','school','Integrated side writing tablet and its metal supporting arm.',w=.50,d=.52,h=.86)
for t,slug,name,form,kw,why in [
 ('I','labelled-filing-tower','Labelled filing tower','file',{'rows':4,'w':.48,'d':.58,'h':1.32,'base':'plinth'},'Four deep file drawers include individual metal label frames.'),
 ('W','plan-flatfile','Architect plan flatfile','flatfile',{'rows':8,'w':1.10,'d':.75,'h':.83},'Eight shallow wide plan drawers on a raised timber frame.'),
 ('C','office-grid-bookcase','Office grid bookcase','grid',{'rows':4,'cols':3,'w':1.20,'h':1.65},'Twelve open cubbies with full vertical dividers.'),
 ('J','staggered-reference-shelf','Staggered reference shelf','staggered',{'rows':5,'w':1.15,'h':1.80},'Alternating half-bay partitions interrupt each open shelf.'),
 ('L','ladder-reference-shelf','Ladder reference shelf','ladder',{'rows':5,'w':.80,'h':1.80,'d':.32},'Sloping stiles behind an open tiered display.'),
 ('I','mesh-office-cabinet','Mesh office cabinet','doors',{'front':'mesh','w':1.0,'h':1.18,'base':'sled'},'Perforated wire-grid doors on a steel underframe.'),
 ('W','office-tambour-credenza','Office tambour credenza','tambour',{'w':1.50,'h':.82},'Continuous stave curtain closes the full-width low office case.'),
 ('C','document-drawer-grid','Document drawer grid','drawers',{'rows':5,'cols':4,'w':1.25,'h':1.10},'Twenty small document drawers, rather than shelves or file rails.')]:add('office',t,slug,name,'case',form,why,**kw)
for t,slug,name,form,why,kw in [
 ('I','rolling-printer-station','Rolling printer station','printer-cart','Two wheeled trays and push handle create a portable work surface.',{'w':.65,'d':.55,'h':.73}),
 ('W','timber-reading-lectern','Timber reading lectern','lectern','Inclined reading surface, raised book stop and broad central column.',{'w':.62,'d':.45,'h':1.12}),
 ('I','server-equipment-rack','Server equipment rack','server-rack','Glazed tall cabinet contains ten separately modelled server faces.',{'w':.65,'d':.70,'h':1.75}),
 ('C','screen-arm-workstation','Monitor arm stand','monitor-arm','Bent articulated display stem and a raised screen.',{'w':.68,'d':.35,'h':.68}),
 ('J','oak-reception-counter','Slatted reception counter','reception','Public raised transaction ledge above an internal desk plane.',{'w':1.65,'d':.65,'h':1.08}),
 ('L','workroom-sewing-table','Sewing workstation','sewing','Trestle worktable with three-dimensional sewing machine and needle.',{'w':1.20,'d':.60,'h':.75}),
 ('I','studio-keyboard-stand','Studio keyboard stand','keyboard','X support carries a real housing and individually modelled keys.',{'w':1.20,'d':.36,'h':.75})]:add('office',t,slug,name,'special',form,why,**kw)

# Children's furniture: separate functions, frames and safe-looking proportions; no safety certification.
for t,slug,name,form,why,kw in [
 ('C','stair-storage-bunk','Stair storage bunk','bunk-stair','Four stair-storage blocks access the upper twin bunk.',{}),
 ('L','perpendicular-bunk','Perpendicular lower bunk','bunk-offset','Lower mattress turns ninety degrees and extends beyond upper footprint.',{}),
 ('I','desk-under-loft','Desk under loft','loft-desk','Fixed writing desk and modesty panel occupy the space beneath the upper bed.',{}),
 ('J','cubby-under-loft','Cubby under loft','loft-cubby','Three low bookcase shelves and dividers beneath the raised sleep deck.',{}),
 ('W','triple-sleep-bunk','Pullout third bunk','bunk-triple','Two fixed bunks plus a projecting third trundle sleep surface.',{}),
 ('C','house-frame-floor-bed','House frame floor bed','floor-house','Floor-level bed enclosed by a real pitched roof/ridge frame.',{'size':'toddler'}),
 ('L','toddler-spindle-bed','Toddler spindle bed','spindle','Toddler-length bed uses open spindles with a low child platform.',{'size':'toddler','platform':.17})]:
 # Toddler spindle remains a size variant of the adult spindle design and is NOT counted.
 add('children',t,slug,name,'bed',form,why,size=kw.pop('size','twin'),**kw)
 if slug=='toddler-spindle-bed':DESIGNS[-1].update({'countEligible':False,'variantOf':'ois.design.spindle-head-bed','familyId':'ois.family.spindle-head-bed'})
for t,slug,name,form,why,kw in [
 ('C','rectangular-nursery-crib','Rectangular nursery crib','crib','Four-sided open spindle enclosure with elevated mattress.',{'w':1.40,'d':.76,'h':.95}),
 ('L','oval-nursery-crib','Oval nursery crib','round-crib','Closed oval rail and radial spindles surround an oval mattress.',{'w':1.10,'d':.72,'h':.85}),
 ('J','open-playpen','Spindle playpen','playpen','Low square open-bar play enclosure with padded base.',{'w':1.15,'d':1.15,'h':.70}),
 ('C','nursery-changing-chest','Nursery changing chest','changing','Raised changing pad and guard rails over three drawers.',{'w':.95,'d':.55,'h':.96}),
 ('J','kitchen-learning-tower','Child learning tower','learning-tower','Guarded standing platform with a lower access step.',{'w':.46,'d':.48,'h':.92}),
 ('W','timber-highchair','Timber highchair','highchair','Raised seat with front food tray and an independent step.',{'w':.44,'d':.46,'h':.94}),
 ('I','child-art-easel','Child art easel','easel','Leaning drawing board, rear strut and projecting paint tray.',{'w':.60,'d':.45,'h':1.10}),
 ('L','gable-dollhouse','Gable dollhouse','dollhouse','Two-storey open play house with a real pitched roof.',{'w':.85,'d':.30,'h':1.05}),
 ('C','play-sink-kitchen','Play sink kitchen','toy-kitchen','Small cupboard includes raised sink, faucet and two burner rings.',{'w':.90,'d':.36,'h':.95}),
 ('I','junior-tool-bench','Junior tool bench','toy-workbench','Open lower shelf, tool pegboard and a projecting vice.',{'w':.80,'d':.38,'h':.92}),
 ('C','bead-maze-cube','Bead maze activity cube','activity-cube','Three curved wires and nine beads rise above a broad activity block.',{'w':.45,'d':.45,'h':.57}),
 ('L','canvas-book-sling','Canvas book sling','book-sling','Three descending textile pockets carried between timber sides.',{'w':.70,'d':.38,'h':.72}),
 ('I','rolling-art-pots','Rolling art cart','art-cart','Mobile art station has three open hollow pots and a lower shelf.',{'w':.72,'d':.40,'h':.68}),
 ('W','raised-train-table','Raised train table','train-table','Raised retaining rim and continuous oval track on the play surface.',{'w':1.10,'d':.75,'h':.48}),
 ('C','timber-rocking-horse','Timber rocking horse','rocking-horse','Sculpted body, neck/head, handgrip and saddle on two curved rockers.',{'w':.92,'d':.40,'h':.88}),
 ('J','canvas-play-tent','Canvas play tent','teepee','Four converging poles, open-front canvas enclosure and floor pad.',{'w':1.10,'d':1.10,'h':1.50})]:add('children',t,slug,name,'special',form,why,**kw)
add('children','C','round-child-activity-table','Round child activity table','table','four-leg','Low circular activity surface on four angled timber legs.',w=.72,d=.72,h=.50,shape='round')
add('children','L','hex-child-pedestal','Hex child pedestal table','table','pedestal','Six-sided low surface over a single broad disc/stem support.',w=.80,d=.70,h=.50,shape='hex')
add('children','J','triangular-child-table','Triangular child table','table','panel','Low triangular top rests on two wide parallel support panels.',w=.85,d=.70,h=.48,shape='triangle')
add('children','C','junior-fork-chair','Junior fork chair','seating','wishbone','Child-sized fork chair is retained as a size variant, not a new design.',w=.34,d=.34,h=.60,seat=.28)
DESIGNS[-1].update({'countEligible':False,'variantOf':'ois.design.fork-back-dining','familyId':'ois.family.fork-back-dining'})
add('children','I','child-tablet-chair','Junior tablet chair','seating','school','Child version of tablet construction; excluded from distinct count.',w=.35,d=.36,h=.62,seat=.29)
DESIGNS[-1].update({'countEligible':False,'variantOf':'ois.design.tablet-training-chair','familyId':'ois.family.tablet-training-chair'})
for t,slug,name,form,kw,why in [
 ('L','house-toy-cubby','Toy cubby wall','grid',{'w':1.10,'d':.35,'h':.92,'rows':2,'cols':4},'Eight reachable open square toy bays on a floor plinth.'),
 ('C','tiered-book-display','Tiered book display','staggered',{'w':.85,'d':.25,'h':1.0,'rows':3},'Alternating shelf dividers make irregular accessible display cells.'),
 ('J','woven-toy-lockers','Woven toy lockers','linen',{'w':1.05,'d':.38,'h':.75,'rows':2,'cols':3},'Six small woven-front doors separate toy storage compartments.'),
 ('I','junior-gear-locker','Junior gear locker','locker',{'w':.75,'d':.40,'h':1.10,'rows':2,'cols':2,'base':'sled'},'Four distinct vented metal locker doors on open sleds.'),
 ('W','toy-drawer-apothecary','Toy drawer apothecary','drawers',{'w':.90,'d':.36,'h':.85,'rows':3,'cols':3},'Nine equally proportioned toy drawers with individual pulls.')]:add('children',t,slug,name,'case',form,why,baseHeight=.05,**kw)

# Entry/hall: purposeful racks, screens, seating and console support types.
for t,slug,name,form,why,kw in [
 ('C','branch-coat-tree','Branch coat tree','coat-tree','Six radial coat branches terminate in rounded timber finials.',{'h':1.75}),
 ('W','ring-hat-stand','Hat ring stand','hat-stand','Hat ring and radial coat branches share a turned centre stem.',{'h':1.78}),
 ('I','open-garment-rail','Open garment rail','garment-rack','Full-width hanging bar bridges two continuous tubular side stands.',{'w':1.10,'d':.50,'h':1.60}),
 ('L','coat-shoe-rail','Coat and shoe rail','coat-rail','Open hanging stand incorporates a separate low shoe platform.',{'w':1.0,'d':.46,'h':1.65}),
 ('I','umbrella-wire-stand','Wire umbrella stand','umbrella','Open circular basket has a separate metal drip tray.',{'h':.56}),
 ('W','hall-cheval-mirror','Hall cheval mirror','cheval','Wide freestanding mirror; size-only relative is excluded.',{'w':.75,'d':.48,'h':1.80}),
 ('J','slatted-privacy-divider','Slatted privacy divider','screen','Three articulated frames filled with open solid timber slats.',{'w':1.65,'h':1.70,'front':'slatted'}),
 ('I','mesh-hall-divider','Mesh hall divider','screen','Three hinged metal mesh panels create a see-through partition.',{'w':1.65,'h':1.70,'front':'mesh'}),
 ('L','reading-magazine-sling','Magazine sling rack','magazine-rack','Two suspended textile pockets between metal V-shaped ends.',{'w':.52,'d':.30,'h':.48}),
 ('C','hall-plant-tripod','Plant tray stand','plant-stand','Raised circular plant tray on four splayed legs.',{'w':.38,'d':.38,'h':.68}),
 ('J','tiered-plant-pedestals','Tiered plant pedestals','plant-tier','Three independent circular trays rise from a common floor plate.',{'w':.82,'d':.43,'h':.98}),
 ('I','three-bike-floor-rack','Three-bike floor rack','bike-rack','Three upright wheel hoops above a flat shared metal base.',{'w':1.15,'d':.48,'h':.60}),
 ('W','entry-guitar-cradle','Guitar cradle stand','guitar-stand','Raised neck fork and two curved body cradles.',{'w':.46,'d':.40,'h':.82}),
 ('L','pet-welcome-bed','Bolstered pet bed','pet-bed','Low padded floor bed with three enclosing bolsters.',{'w':.80,'d':.60,'h':.30})]:
 add('entry-hall',t,slug,name,'special',form,why,**kw)
 if slug=='hall-cheval-mirror':DESIGNS[-1].update({'countEligible':False,'variantOf':'ois.design.cheval-dressing-mirror','familyId':'ois.family.cheval-dressing-mirror'})
for t,slug,name,form,shape,why in [
 ('W','oval-hall-console','Oval hall console','dual-disc','oval','Narrow oval top on twin disc stems.'),
 ('C','arch-hall-console','Arch hall console','arch','rect','Long narrow top sits on two open arches.'),
 ('J','waterfall-hall-console','Waterfall hall console','waterfall','racetrack','Capsule top and full-depth end panels create a softened portal.'),
 ('I','hairpin-hall-console','Hairpin hall console','hairpin','rect','Long shallow top has exposed wire hairpin legs.'),
 ('L','half-hex-console','Hexagonal hall console','panel','hex','Six-sided console top on two full-width timber panels.')]:add('entry-hall',t,slug,name,'table',form,why,w=1.15,d=.35,h=.79,shape=shape)
add('entry-hall','C','open-shoe-slope-rack','Sloping shoe rack','case','shoe','Three tilted shelves support shoes with open front access.',w=.92,d=.34,h=.70,rows=3,baseHeight=.06)
add('entry-hall','W','hall-apothecary-chest','Hall apothecary chest','case','drawers','Twelve small drawers in four columns distinguish the hallway key chest.',w=1.0,d=.32,h=.82,rows=3,cols=4)
add('entry-hall','L','louver-shoe-cupboard','Louver shoe cupboard','case','doors','Two ventilated louvre panels conceal a low shoe cupboard.',w=.96,d=.34,h=.88,front='louvre')
add('entry-hall','I','key-charging-console','Device charging console','special','charging-station','Three device slots and charging ledge above a cupboard.',w=.85,d=.34,h=.82)

# Laundry/utility, including real service objects rather than decorative recolours.
for t,slug,name,form,why,kw in [
 ('C','front-load-laundry','Front-load washing machine','front-washer','Circular glazed front door, controls and box enclosure.',{}),
 ('I','vented-tumble-dryer','Vented tumble dryer','dryer','Front drum door plus visibly vented lower grille.',{'steel':True}),
 ('L','top-load-washer','Top-load washing machine','top-washer','Horizontal glazed lid and raised rear control console.',{}),
 ('I','stacked-washer-dryer','Stacked washer and dryer','stacked-laundry','Two full drum units with independent front controls.',{}),
 ('C','chest-utility-freezer','Chest freezer','chest-freezer','Wide upward-opening top lid with front pull.',{'w':1.10,'d':.65,'h':.88}),
 ('J','deep-utility-sink','Deep utility sink','utility-sink','Deep hollow service basin stands on exposed metal legs.',{'w':.68,'d':.58,'h':.90})]:add('laundry-utility',t,slug,name,'appliance',form,why,**kw)
for t,slug,name,form,why,kw in [
 ('C','wing-drying-rack','Wing drying rack','drying-wings','Main horizontal wires plus two raised folding wings.',{'w':1.0,'d':.56,'h':.94}),
 ('I','tower-drying-rack','Tower drying rack','drying-tower','Three separate wire drying decks above tubular supports.',{'w':.70,'d':.50,'h':1.30}),
 ('L','ironing-crossboard','Cross-frame ironing board','ironing-board','Long capsule ironing pad and projecting iron rest on crossed legs.',{'w':1.25,'d':.38,'h':.86}),
 ('J','three-laundry-sorter','Three-bag laundry sorter','sorter','Three independent fabric bags between two metal frame ends.',{'w':1.10,'d':.40,'h':.72,'cols':3}),
 ('W','hinged-laundry-hamper','Hinged laundry hamper','hamper','Timber body and separate horizontal lift lid.',{'w':.50,'d':.40,'h':.70}),
 ('I','folding-utility-table','Folding utility table','fold-table','Thin rectangular work surface over two crossed leg frames.',{'w':1.10,'d':.60,'h':.80}),
 ('C','utility-tool-workbench','Utility tool workbench','workbench','Heavy trestle work surface, two suspended drawers and lower shelf.',{'w':1.50,'d':.65,'h':.90}),
 ('I','pegboard-tool-station','Pegboard tool station','tool-pegboard','Tall hole-pattern pegboard rises behind a braced work surface.',{'w':1.20,'d':.55,'h':1.70}),
 ('L','utility-pet-crate','Pet crate cabinet','dog-crate','Floor-level woven wire-grid doors form a ventilated enclosure.',{'w':.92,'d':.60,'h':.72}),
 ('J','utility-litter-console','Litter enclosure console','cat-litter','Cabinet has a framed front pet-entry extension.',{'w':.90,'d':.55,'h':.65})]:add('laundry-utility',t,slug,name,'special',form,why,**kw)
add('laundry-utility','C','cleaning-locker-tower','Cleaning locker tower','case','locker','Four tall louvred compartments separate cleaning equipment.',w=.80,d=.48,h=1.85,rows=2,cols=2,base='plinth')
add('laundry-utility','I','laundry-open-grid','Laundry open grid','case','grid','Nine open service cubbies on steel sled supports.',w=1.2,d=.45,h=1.35,rows=3,cols=3,base='sled')

# Storage-focused designs and additional substantial structures.
for t,slug,name,form,front,kw,why in [
 ('C','two-bay-low-bookcase','Two-bay low bookcase','grid','slab',{'w':1.2,'h':.90,'rows':3,'cols':2},'Six rectangular open cells in two columns.'),
 ('W','four-bay-display','Four-bay display cabinet','doors','glass',{'w':1.8,'h':1.20,'doors':4},'Four independent glazed doors make a horizontal display case.'),
 ('J','nine-square-cubby','Nine-square cubby','grid','slab',{'w':1.05,'h':1.05,'rows':3,'cols':3,'base':'plinth'},'Nine equally proportioned square open compartments.'),
 ('L','wide-cane-credenza','Wide cane credenza','doors','cane',{'w':1.8,'h':.75,'doors':4},'Four woven panels on a long low elevated case.'),
 ('I','steel-mesh-locker-bank','Steel mesh locker bank','linen','mesh',{'w':1.2,'h':1.80,'rows':3,'cols':3,'base':'sled'},'Nine independently framed locker cells.'),
 ('C','five-tier-open-tower','Five-tier open tower','open','slab',{'w':.58,'h':1.90,'rows':5},'Narrow five-tier open shelf with uninterrupted vertical sides.'),
 ('W','six-drawer-double-chest','Six drawer double chest','drawers','slab',{'w':1.30,'h':.95,'rows':2,'cols':3},'Six broad drawers arranged as three columns and two rows.'),
 ('J','two-drawer-wide-chest','Two drawer wide chest','drawers','slab',{'w':1.20,'h':.65,'rows':2,'cols':1,'base':'plinth'},'Two very broad low drawers over a recessed floor plinth.'),
 ('L','four-door-louver-credenza','Louver credenza','doors','louvre',{'w':1.70,'h':.82,'doors':4},'Four slatted ventilation panels create a long horizontal cabinet.'),
 ('C','shaker-three-door-console','Three-door shaker console','doors','shaker',{'w':1.40,'h':.85,'doors':3},'Three framed recessed panels and independent pulls.'),
 ('I','two-column-label-file','Two-column label file','file','slab',{'w':.90,'h':1.10,'rows':3,'cols':2,'base':'sled'},'Six labelled document drawers in two raised columns.'),
 ('W','small-parts-apothecary','Small-parts apothecary','drawers','slab',{'w':1.25,'h':1.35,'rows':6,'cols':5},'Thirty small drawers form a dense storage grid.'),
 ('J','leaning-open-display','Leaning open display','ladder','slab',{'w':1.15,'h':1.65,'rows':3,'cols':2},'Three levels split into six bays with independent leaning stiles.'),
 ('L','staggered-room-divider','Staggered room divider','staggered','slab',{'w':1.65,'h':1.40,'rows':4,'cols':2},'Open shelves interrupted by alternating offset and centre partitions.'),
 ('I','wire-front-low-console','Wire-front low console','doors','mesh',{'w':1.50,'h':.58,'doors':3,'base':'sled'},'Three low mesh doors above two continuous metal sleds.'),
 ('C','tall-shaker-single','Single shaker cupboard','doors','shaker',{'w':.60,'h':1.65,'doors':1},'Single tall recessed-panel door, not split hanging wardrobe.'),
 ('W','wide-flatfile-storage','Wide flatfile chest','flatfile','slab',{'w':1.40,'d':.80,'h':.72,'rows':5,'cols':2},'Ten wide shallow plan drawers arranged in two banks.'),
 ('J','tambour-tall-case','Tambour tall case','tambour','slab',{'w':.80,'h':1.60},'Continuous full-height vertical stave front with no hinged door breaks.'),
 ('L','linen-cell-cabinet','Linen cell cabinet','linen','cane',{'w':1.20,'h':1.25,'rows':2,'cols':3},'Six wide cane-front storage compartments.'),
 ('I','industrial-open-etagere','Industrial open etagere','etagere','slab',{'w':1.20,'h':1.85,'rows':6,'cols':2,'base':'sled'},'Twelve open shelf bays on a raised steel sled base.'),
 ('C','stepped-display-case','Stepped display case','step','slab',{'w':1.10,'h':.75},'Three offset raised top ledges create a stepped outline.'),
 ('W','writing-bureau-cabinet','Writing bureau cabinet','fold-down','shaker',{'w':1.10,'h':1.45},'Framed upper panel above a deep hinged writing leaf and stays.'),
 ('J','wine-cross-cell','Wine cross-cell stand','wine-lattice','slab',{'w':.62,'h':.86,'base':'plinth'},'Open diamond storage lattice; larger wine cabinet relative must be reviewed.'),
 ('I','equipment-safe','Equipment safe','doors','slab',{'w':.65,'h':.95,'doors':1,'base':'plinth'},'Single heavy slab door; safe locking wheel is supplied by separate builder.')]:
 add('storage',t,slug,name,'case',form,why,front=front,**kw)
 if slug in ('wine-cross-cell','equipment-safe'):DESIGNS[-1]['countEligible']=False
add('storage','I','wheel-lock-safe','Wheel-lock safe','special','safe','Heavy door with a real circular locking wheel and three spokes.',w=.65,d=.55,h=.95)
add('storage','L','cat-platform-tree','Cat platform tree','special','pet-tower','Three rope posts hold separate platforms at different heights.',w=.85,d=.60,h=1.30)
add('living','W','upright-room-piano','Upright room piano','special','piano','Deep upright case, raised keyboard, independent keys and timber legs.',w=1.42,d=.62,h=1.18)

# Lighting across rooms: one design per structural shade/support combination.
for room,t,slug,name,form,h,why in [
 ('living','W','arc-shade-floor','Arc shade floor lamp','arc',1.85,'Swept metal arc offsets an open shade from its weighted floor base.'),
 ('living','J','paper-rib-floor','Ribbed paper floor lamp','paper',1.55,'Ellipsoidal lantern with individually modelled circumferential ribs.'),
 ('living','C','tripod-linen-floor','Tripod linen floor lamp','tripod-shade',1.58,'Three converging timber legs support an open fabric shade.'),
 ('living','I','jointed-task-floor','Jointed task floor lamp','task',1.50,'Three-segment articulated arm offsets a compact task shade.'),
 ('living','L','shelf-floor-light','Shelf floor light','shelf-lamp',1.55,'Three usable circular shelves surround an integrated light stem.'),
 ('living','I','open-cage-floor','Open cage floor light','cage',1.60,'Ten metal cage ribs surround visible bulb geometry.'),
 ('living','W','globe-branch-floor','Branch globe floor lamp','globe-cluster',1.65,'Three offset branches end in separate opal globes.'),
 ('living','J','bowl-uplighter','Bowl uplighter','uplighter',1.70,'Flared upward hollow bowl instead of a downward textile shade.'),
 ('living','I','tree-torchiere','Tree torchiere','torchiere-tree',1.68,'Three independent stems support hollow upward bowls.'),
 ('bedroom','L','ceramic-bedside-light','Ceramic bedside lamp','ceramic-table',.66,'Turned ceramic body and open linen shade on a low footprint.'),
 ('bedroom','W','mushroom-bedside','Mushroom bedside lamp','mushroom',.48,'Broad domed cap and slim central stem over a weighted base.'),
 ('office','W','banker-desk-light','Banker desk lamp','banker',.43,'Long rounded task shade held by a two-sided brass bracket.'),
 ('office','I','cage-table-light','Cage table light','cage',.56,'Compact open cage is a size variant and excluded.',),
 ('bedroom','J','paper-table-light','Paper table light','paper',.62,'Paper floor-lamp size variant; excluded.',),
 ('office','C','task-desk-light','Task desk light','task',.60,'Task floor-lamp size variant; excluded.',)]:
 add(room,t,slug,name,'light',form,why,h=h)
 if slug in ('cage-table-light','paper-table-light','task-desk-light'):DESIGNS[-1]['countEligible']=False

# Additional sculptural construction briefs add broad shape diversity, not palette copies.
for room,t,slug,name,form,w,d,h,why in [
 ('living','C','arched-open-bookcase','Arched open bookcase','arch-bookcase',.90,.34,1.75,'Continuous real arched crown over three open display shelves.'),
 ('bedroom','W','arched-panel-cupboard','Arched panel cupboard','arch-door',1.0,.42,1.85,'Arched upper display plus two recessed lower cupboard doors.'),
 ('dining','L','arched-cane-display','Arched cane display','arch-cane',1.05,.40,1.80,'Open upper arch above woven lower doors.'),
 ('storage','J','branch-book-tree','Branch book tree','tree-bookcase',.85,.30,1.70,'Alternating inclined branch shelves attach to a solid vertical trunk.'),
 ('storage','I','zigzag-display','Zigzag display','zigzag-shelf',1.05,.30,1.60,'Five alternating tilted shelf planes between exposed upright rails.'),
 ('living','W','circular-chord-shelf','Circular chord shelf','circular-shelf',1.25,.28,1.25,'Circular external frame contains three shelves of different chord lengths.'),
 ('storage','C','diamond-display-frame','Diamond display frame','diamond-shelf',1.30,.32,1.25,'Three diamond frames intersect a shared horizontal shelf.'),
 ('office','I','cantilever-reference-tree','Cantilever reference tree','cantilever-shelf',.85,.32,1.65,'Alternately offset shelves cantilever from a narrow structural rear panel.'),
 ('children','C','stair-cubby-storage','Stair cubby storage','stair-cubby',1.20,.35,1.20,'Four stepped vertical banks contain one to four accessible cubbies.'),
 ('children','L','honeycomb-toy-display','Honeycomb toy display','hex-cells',1.10,.30,1.20,'Six open hexagonal frames provide distinct toy display cells.'),
 ('entry-hall','C','five-slat-bench','Five-slat entry bench','slat-bench',1.10,.40,.45,'Five separated timber seat staves over a splayed leg frame.'),
 ('entry-hall','W','lift-lid-storage-bench','Lift-lid storage bench','storage-bench',1.15,.42,.45,'Slatted seat lifts over a fully enclosed storage box.'),
 ('entry-hall','C','hall-church-settle','Hall church settle','church-bench',1.25,.45,1.0,'Continuous tall timber back and arm rails make an enclosed settle.'),
 ('living','J','segmented-curve-bench','Segmented curve bench','curved-bench',1.45,.42,.45,'Nine radial timber seat sections form a clear curved plan.'),
 ('dining','I','braced-picnic-bench','Braced picnic bench','picnic-bench',1.45,.40,.45,'Separated seat staves bridge two braced trestles and stretcher.'),
 ('entry-hall','L','planter-end-bench','Planter end bench','planter-bench',1.10,.42,.55,'Two open hollow planters terminate the slatted bench.'),
 ('entry-hall','C','spindle-hall-settle','Spindle hall settle','spindle-settle',1.15,.44,.98,'Open slatted back panel and raised arm rails distinguish the settle.'),
 ('bedroom','L','woven-end-settle','Woven end settle','cane-settle',1.20,.45,.98,'Cane-woven back and solid arms over a slatted timber seat.'),
 ('bedroom','W','barrel-lid-trunk','Barrel lid trunk','rounded-trunk',.95,.46,.50,'Real curved barrel lid rises above the rectangular storage body.'),
 ('storage','I','banded-barrel-trunk','Banded barrel trunk','ribbed-trunk',1.0,.48,.53,'Twin structural metal bands wrap over a barrel lid.'),
 ('living','J','radial-fin-coffee','Radial fin coffee table','radial-coffee',.85,.85,.39,'Twelve radial vertical fins make an open cylindrical support.'),
 ('living','I','ring-support-coffee','Ring support coffee table','ring-base-table',1.10,.60,.40,'Two complete circular-plane steel rings support a thin top.'),
 ('living','C','cross-panel-coffee','Cross-panel coffee table','cross-panel-table',.90,.90,.39,'Two interlocking perpendicular full-height timber panels.'),
 ('living','W','three-way-y-coffee','Three-way Y coffee table','y-base-table',.95,.68,.42,'Three converging branches form a Y-shaped pedestal.'),
 ('living','J','stone-orb-coffee','Stone orb coffee table','sphere-base-table',.90,.80,.39,'A broad sculptural stone ellipsoid supports the stone top.')]:add(room,t,slug,name,'sculptural',form,why,w=w,d=d,h=h)
for room,t,slug,name,form,shape,w,d,h,why,kw in [
 ('dining','J','oval-waterfall-family','Oval waterfall family table','waterfall','oval',1.80,.90,.75,'Oval family top over two broad continuous waterfall end slabs.',{}),
 ('dining','W','triangle-tulip-table','Triangular tulip table','tulip','triangle',1.20,1.05,.75,'Triangular dining silhouette on a single swept tulip pedestal.',{}),
 ('dining','L','hex-trestle-table','Hex trestle table','trestle','hex',1.30,1.15,.75,'Six-sided family top sits above two braced timber A frames.',{}),
 ('dining','C','round-arch-table','Round arch table','arch','round',1.20,1.20,.75,'Circular family top over two continuous curved timber arches.',{}),
 ('living','I','triangle-hairpin-coffee','Triangle hairpin coffee table','hairpin','triangle',1.0,.70,.40,'Triangular occasional top with four visibly open bent-wire supports.',{}),
 ('living','W','kidney-tulip-coffee','Kidney tulip coffee table','tulip','kidney',1.10,.65,.40,'Concave kidney top on a flared metal tulip foot.',{}),
 ('living','L','oval-waterfall-coffee','Oval waterfall coffee table','waterfall','oval',1.05,.60,.40,'Oval top and broad full-depth end panels create a low portal.',{}),
 ('living','C','hex-panel-coffee','Hex panel coffee table','panel','hex',.90,.75,.41,'Hexagonal top is bridged by two independent planar supports.',{}),
 ('living','J','round-cross-coffee','Round crossed coffee table','cross','round',.85,.85,.39,'Circular top over two diagonally crossed leg pairs.',{}),
 ('living','I','racetrack-cantilever-coffee','Capsule cantilever coffee table','cantilever','racetrack',1.05,.55,.40,'Capsule top cantilevers from one offset broad plate.',{}),
 ('bedroom','C','round-trestle-vanity','Round trestle dressing table','trestle','round',.90,.90,.75,'Circular dressing surface above braced trestles.',{'drawers':1}),
 ('bedroom','W','kidney-hairpin-vanity','Kidney hairpin dressing table','hairpin','kidney',1.15,.65,.75,'Kidney dressing surface and thin hairpin legs with suspended drawer.',{'drawers':1}),
 ('office','J','triangle-panel-desk','Triangular panel desk','panel','triangle',1.25,.85,.75,'Triangular workspace above two broad full-height panels.',{'drawers':1}),
 ('office','I','hex-sled-worktable','Hex sled worktable','sled','hex',1.30,1.10,.76,'Six-sided project surface over open steel sleds.',{}),
 ('office','L','racetrack-sawhorse-desk','Capsule sawhorse desk','sawhorse','racetrack',1.45,.70,.75,'Capsule desk slab rests on two separate A-frame sawhorses.',{}),
 ('office','W','oval-fluted-worktable','Oval fluted worktable','drum','oval',1.50,.80,.75,'Oval work surface on a full-height timber fluted drum.',{}),
 ('entry-hall','J','triangle-cantilever-console','Triangular cantilever console','cantilever','triangle',.95,.42,.80,'Triangular shallow console projecting from an offset steel plate.',{}),
 ('entry-hall','C','kidney-trestle-console','Kidney trestle console','trestle','kidney',1.10,.42,.78,'Narrow concave top carried by two open timber trestles.',{}),
 ('kitchen','I','steel-prep-trolley','Steel preparation trolley','trolley','rect',.95,.55,.90,'Rolling metal-framed preparation station with separate lower tray.',{'top':'stone'}),
 ('children','L','oval-child-trestle','Oval child craft table','trestle','oval',.85,.60,.50,'Low oval activity top over braced A-frame supports.',{}),
 ('children','I','hex-child-sled','Hex child project table','sled','hex',.85,.75,.50,'Low six-sided play top over continuous steel sleds.',{}),
 ('storage','W','oval-mobile-display','Oval mobile display trolley','trolley','oval',.85,.48,.82,'Oval rolling upper tray over rectangular lower display shelf.',{}),
 ('laundry-utility','I','panel-folding-station','Panel laundry folding station','panel','rect',1.35,.65,.90,'Wide folding worktop on full-height end panels and a low undershelf.',{'shelf':True}),
 ('living','L','round-two-level-nest','Round two-level nest','nested','round',.80,.80,.48,'Two round interlocking heights and independent exposed support legs.',{}),
 ('dining','J','hex-conical-breakfast','Hex conical breakfast table','cone','hex',1.10,1.0,.75,'Hexagonal breakfast top sits on a tapered timber central cone.',{})]:add(room,t,slug,name,'table',form,why,w=w,d=d,h=h,shape=shape,**kw)

for room,t,slug,name,form,w,d,h,why in [
 ('dining','C','drop-leaf-family-table','Drop-leaf family table','drop-leaf',1.65,.86,.75,'Two visibly hinged downward leaves attach to a narrow supported centre.'),
 ('dining','W','swing-gateleg-table','Swing gateleg table','gateleg',1.50,.80,.75,'Swing-out gate legs support two folding leaves.'),
 ('living','I','raised-lift-coffee','Raised lift coffee table','lift-top',1.10,.60,.68,'Open storage case and four metal lift linkages support an elevated top.'),
 ('dining','C','combined-picnic-table','Combined picnic table','picnic-combined',1.75,1.25,.75,'Bench seats connect structurally to the dining trestles with outriggers.'),
 ('office','I','tilted-instrument-board','Tilted instrument board','drafting-ledge',1.20,.70,.95,'Steep drawing plane, long instrument ledge and crossed steel support.'),
 ('kitchen','J','wall-fold-breakfast','Wall-fold breakfast table','fold-wall',.90,.55,1.15,'Horizontal folding leaf and wall plate connect through diagonal metal stays.'),
 ('living','L','woven-papasan-bowl','Woven papasan bowl chair','papasan',.90,.90,.80,'Tilted hollow wicker bowl and circular cushion sit on a short pedestal.'),
 ('children','C','soft-bean-chair','Soft bean chair','bean-chair',.88,.78,.80,'Two large sculptural soft volumes make a low self-supporting seat/back.'),
 ('bedroom','J','reclined-floor-chair','Reclined floor chair','floor-chair',.60,.70,.70,'Floor cushion and angled back sit on continuous bent timber runners.'),
 ('living','I','butterfly-sling-seat','Butterfly sling seat','butterfly',.75,.75,.87,'Six-point suspended saddle textile connects two crossed tubular frames.'),
 ('bedroom','W','channel-chaise-longue','Channel chaise longue','chaise-longue',.70,1.65,.95,'Twelve inclined padded channels follow an ergonomic reclining frame.'),
 ('dining','J','continuous-bent-ply','Continuous bent-ply chair','bent-ply',.55,.70,.88,'One thick continuous plywood ribbon forms seat, back and cantilever support.'),
 ('dining','L','corner-wall-banquette','Corner wall banquette','corner-banquette',1.65,1.10,.95,'Two perpendicular padded plinths meet full-height wall backs.'),
 ('storage','C','triangular-corner-shelf','Triangular corner shelf','corner-shelf',.85,.70,1.60,'Five triangular shelf planes connect three separate corner uprights.'),
 ('storage','I','spiral-pole-display','Spiral pole display','spiral-shelf',.75,.75,1.70,'Nine oval platforms rotate around a central vertical mast.'),
 ('storage','W','offset-cube-tower','Offset cube tower','offset-cube-shelf',.90,.35,1.65,'Four complete open box modules alternate their horizontal offset.'),
 ('dining','L','round-serving-etagere','Round serving etagere','cylinder-display',.70,.70,1.45,'Four circular shelves are linked by three peripheral metal posts.'),
 ('office','C','rotating-book-tower','Rotating book tower','rotating-book-tower',.66,.66,1.35,'Circular shelves and cross-shaped radial partitions over a turntable foot.'),
 ('storage','J','a-frame-display','A-frame display shelf','a-frame-shelf',1.0,.65,1.65,'Tapering triangular side frames support successively shallower shelves.'),
 ('storage','L','rope-suspended-shelves','Rope suspended shelves','suspended-rope-shelf',.90,.35,1.45,'Four taut rope uprights suspend four broad shelf boards.'),
 ('living','W','sliding-slat-bookcase','Sliding slat bookcase','sliding-bookcase',1.20,.38,1.55,'Partial-width sliding slatted door reveals the open shelves behind.'),
 ('children','L','rocking-woven-bassinet','Rocking woven bassinet','bassinet-rocker',.95,.52,.85,'Open shallow curved basket rises on independent twin rocking runners.'),
 ('office','I','acoustic-phone-booth','Acoustic phone booth','acoustic-booth',1.05,1.0,1.95,'Floor, roof and padded sides enclose a desk and fixed seat; front remains open.'),
 ('office','C','double-study-carrel','Double study carrel','double-study',1.65,1.10,1.30,'Two work sides share a central acoustic screen and two end partitions.'),
 ('dining','W','semicircular-banquette','Semicircular banquette','circular-banquette',2.0,1.7,1.05,'Nine radial padded seats and backs make a semicircular dining booth.'),
 ('entry-hall','C','integrated-hall-tree','Integrated hall tree','hall-tree',1.10,.43,1.75,'Storage bench, tall timber back, hat shelf and three coat hooks form one unit.'),
 ('laundry-utility','I','boot-tray-bench','Boot tray bench','boot-wash-bench',1.0,.42,.50,'Slatted seat rises above an independent hollow metal boot-drip tray.')]:add(room,t,slug,name,'functional',form,why,w=w,d=d,h=h)

# Additional constructions expand core furniture rather than appliance/fixture counts.
for room,t,form,name,why in [
 ('office','C','kneeling-chair','Padded kneeling chair','Angled seat and lower knee pad bridge a rocking timber frame.'),
 ('office','I','mesh-task-chair','Mesh suspension task chair','Perforated flexible back and open seat frame over a five-caster base.'),
 ('office','J','rolling-saddle','Rolling saddle seat','Concave carved saddle over an adjustable five-point rolling pedestal.'),
 ('living','L','director-chair','Folding director chair','Crossed timber side frames tension separate textile seat and back.'),
 ('living','C','slat-reclining-chair','Slat reclining chair','Curved reclining slats connect long inclined side rails.'),
 ('living','I','string-hoop-chair','String hoop chair','Tension strings span an inclined circular frame on tubular supports.'),
 ('living','L','suspended-wicker-chair','Suspended wicker chair','Open woven egg hangs from a freestanding curved suspension mast.'),
 ('living','W','peacock-chair','Fan woven throne','Large radiating wicker fan back joins a padded round seat over four timber legs.'),
 ('bedroom','I','arched-iron-bed','Arched iron bed','Metal arched end frames and vertical rods support a full sleeping deck.'),
 ('bedroom','C','lift-storage-bed','Open lift storage bed','Raised mattress deck exposes a box storage cavity and paired lift stays.'),
 ('bedroom','W','murphy-bed','Deployed wall bed','Vertical cabinet and hinge system connect a deployed full sleeping platform.'),
 ('office','W','curved-rolltop-desk','Curved rolltop desk','Curved tambour enclosure rises over a two-drawer writing plane and four timber legs.'),
 ('office','C','compass-desk','Compass-leg writing desk','Splayed compass side frames with low pivot joints support a slim writing plane.'),
 ('storage','J','wave-bookcase','Wave shelf bookcase','Five curved horizontal shelves intersect three tall timber support masts.'),
 ('storage','W','ribbon-s-bookcase','Continuous ribbon bookcase','A continuous S-shaped ribbon folds through staggered open shelf levels.'),
 ('bedroom','C','cylinder-tambour-cabinet','Cylindrical tambour cabinet','A curved slatted enclosure reveals radial shelves behind an open sector.'),
 ('bedroom','J','ovoid-open-nightstand','Ovoid hollow nightstand','Thick ovoid shell encloses a shelf rather than a rectangular carcass.'),
 ('entry-hall','W','tilting-shoe-cabinet','Open tilt shoe cabinet','Tilted full-width bins expose their actual shoe compartments and pivot hardware.'),
 ('kitchen','C','corner-carousel','Corner carousel cabinet','Quarter-circle case exposes circular rotating trays and central spindle.'),
 ('kitchen','I','curved-breakfast-counter','Curved breakfast counter','Curved counter follows an open annular cabinet with radial partitions.'),
 ('kitchen','W','bakers-bin-hutch','Bakers flour-bin hutch','Upper display shelving rises above outward-tilted ingredient bins.'),
 ('children','L','arched-reading-nook','Arched reading nook','Wide hollow arch encloses an upholstered reading bench.'),
 ('children','C','integrated-play-table','Integrated four-seat play table','Four wedge seats connect to a shared table frame with radial outriggers.'),
 ('storage','I','library-book-cart','Sloped library book cart','Opposing inclined book trays bridge tall end frames on four casters.'),
 ('children','C','classroom-coat-station','Classroom coat station','Three open coat bays and hooks rise above cubbies and shared bench seating.'),
 ('dining','W','extension-dining-table','Extended dining table','Separate inserted centre leaf and two outer leaves sit over nested sliding metal extension rails.'),
 ('entry-hall','J','ribbon-console','Folded ribbon console','Continuous bent ribbon alternates floor support and elevated console top.'),
 ('living','C','stone-bridge-coffee','Stone arch bridge table','A monolithic deep arch supports the top through integral stone piers.'),
 ('living','W','twisted-root-coffee','Twisted root coffee table','Three curved laminated roots twist between separate feet and an oval top.'),
 ('dining','L','double-sided-booth','Double-sided dining booth','Two opposing padded seats share one central full-height upholstered back.')]:add(room,t,form,name,'signature',form,why)

# Mattress-size exports remain variants of their construction design, never new counts.
for parent in list(DESIGNS):
 if parent['builder']=='bed' and parent['parameters'].get('size')=='queen':
  for size in ('twin','full','king'):
   variant=copy.deepcopy(parent);variant['id']=parent['id']+'.size.'+size;variant['parameters']['size']=size;variant['name']=parent['name']+' — '+('Full / double' if size=='full' else size.title());variant.update({'countEligible':False,'variantOf':parent['id'],'designId':parent['designId'],'familyId':parent['familyId'],'countExclusion':'mattress-size variant; regenerates frame geometry without increasing design count'});DESIGNS.append(variant)

# Collapse configurations that only change dimensions/materials, even where topology hashes
# differ because of bevel radii, fixed millimetre hardware or triangulation. The first brief
# stays canonical; other entries remain usable variants and never increase design counts.
def construction_key(a):
 p=a['parameters'];b=a['builder'];f=p['form']
 if b=='seating' and f in ('windsor','spindle'):f='bow-spindle'
 if b=='seating' and f in ('task','executive'):f='rolling-task'
 if b=='special' and f in ('crib','playpen'):f='rectangular-spindle-enclosure'
 if b=='kitchen' and f in ('pullout-pantry','spice-pullout'):f='basket-pullout'
 if b=='table':cfg={'shape':'ellipse' if p.get('shape','rect') in ('round','oval') else p.get('shape','rect'),'drawers':bool(p.get('drawers')),'shelf':p.get('shelf',False)}
 elif b=='case':
  cfg={'front':p.get('front','slab'),'base':p.get('base','taper'),'rows':p.get('rows',4),'cols':p.get('cols',1),'doors':p.get('doors',2),'drawersTop':p.get('drawersTop',False)}
  if f in ('doors','wardrobe','hutch'):
   cfg={k:v for k,v in cfg.items() if k not in ('rows','cols','doors')}
  if f in ('open','grid','etagere','cubby'):
   f='open-shelf';cfg={'base':p.get('base','taper'),'partitioned':p.get('cols',1)>1}
  if f in ('linen','locker','ladder','staggered'):cfg={'base':p.get('base','taper')}
  if f in ('drawers','flatfile','file'):cfg['rows']='stack';cfg['cols']='multiple' if p.get('cols',1)>1 else 'single'
 elif b=='seating':cfg={'base':p.get('base','taper')}
 elif b=='special':cfg={'front':p.get('front','cane'),'cols':p.get('cols',1),'panels':p.get('panels',3)}
 else:cfg={}
 return b,f,json.dumps(cfg,sort_keys=True)
seen={}
for a in DESIGNS:
 if a['id']=='ois.design.oval-soaking-tub':a.update({'countEligible':False,'variantOf':'ois.design.oval-floor-tub','familyId':'ois.family.oval-floor-tub','countExclusion':'same curved tub construction; depth/length configuration only'})
 if a['id']=='ois.design.ring-hat-stand':a.update({'countEligible':False,'variantOf':'ois.design.branch-coat-tree','familyId':'ois.family.branch-coat-tree','countExclusion':'auxiliary hat ring does not justify another complete coat-tree design count'})
 if a['id']=='ois.design.banded-barrel-trunk':a.update({'countEligible':False,'variantOf':'ois.design.barrel-lid-trunk','familyId':'ois.family.barrel-lid-trunk','countExclusion':'metal bands are a construction/detail variant of the same barrel-lid trunk'})
 if a['id']=='ois.design.round-drum-coffee':a['name']='Oval fluted coffee table';a['distinction']='Oval top over a full-height fluted cylindrical pedestal.'
 if a['id']=='ois.design.stair-storage-bunk':a['distinction']='Seven accessible stair-storage blocks lead to the upper twin bunk.'
 if a['id']=='ois.design.triangle-hairpin-coffee':a['distinction']='Triangular occasional top with three bent-wire supports placed inside its outline.'
 key=construction_key(a);a['constructionKey']='|'.join(key)
 if a['countEligible'] and key in seen:
  parent=seen[key];a.update({'countEligible':False,'variantOf':parent['id'],'familyId':parent['familyId'],'countExclusion':'same construction; dimension/material configuration retained as a variant'})
 elif a['countEligible']:seen[key]=a

if __name__=='__main__':
 assert len({x['id'] for x in DESIGNS})==len(DESIGNS)
 (ROOT/'catalogue-v2/inventory.json').write_text(json.dumps({'schemaVersion':1,'designs':DESIGNS},indent=2))
 print('briefs',len(DESIGNS),'eligible',sum(x['countEligible'] for x in DESIGNS))
