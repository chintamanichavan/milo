/**
 * The written half of every guide, one block per exercise. A line starts with
 * a key: p purpose, s setup, e steps, c cues, m mistakes ("mistake > fix"),
 * n setup numbers, f first time, and optionally r reps, b breathing, x safety.
 * Lists are split on " | ". The first mistake is the one the figure draws.
 */
export const TEXT = `
#squat a:squat
p: The main lower-body strength lift. It trains the thighs, glutes and a strong trunk all at once.
s: Set the bar in the rack at mid-chest height | Step under and rest it on your upper back, just below the bony knob at the base of the neck | Grip just outside your shoulders and pull your elbows down under the bar | Stand up, take two short steps back, feet about shoulder width, toes turned out a little
e: Take a big breath into your belly and brace | Bend at the hips and knees together and sit down between your heels | Let your knees travel forward, in line with your toes | Go down until your hip crease is level with the top of your knee, or lower | Drive up through the whole foot, chest and hips rising together | Stand tall and reset your breath before the next rep
c: Push the floor away | Knees follow the toes | Chest proud, back tight
m: Chest falls forward and the hips shoot up first > Take weight off, and lead the way up with your upper back | Knees cave inwards > Push your knees out over your little toes as you stand | Heels come up off the floor > Sit back a little more, keep your weight over the middle of your foot, and wear flat shoes | Stopping well short of depth > Lower the weight and squat to a box set at the right height
n: Feet shoulder width, toes out 15–30°. Bar on the upper back. Safety arms set a few centimetres below your lowest point.
f: Use just the bar for your first two sessions. Film one set from the side: your hips and knees should bend at the same moment.

#front-squat a:squat
p: A squat with the bar on the front of the shoulders. It keeps you upright and puts more work on the thighs.
s: Bar in the rack at shoulder height | Step in so the bar sits on the front of your shoulders, against your throat | Fingertips under the bar just outside the shoulders, elbows pushed high and forward | Step back, feet shoulder width, toes out a little
e: Breathe in and brace, elbows up | Sit straight down between your heels, torso tall | Keep your elbows high all the way down | Go down until your thighs are at least level with the floor | Drive up, leading with your elbows and chest | Stand tall and reset
c: Elbows to the ceiling | Sit between your heels | Stay tall
m: Elbows drop and the bar rolls forward > Drive your elbows up hard, and loosen the grip to just two or three fingers if your wrists are stiff | Rounding the upper back > Take weight off and hold each rep at the bottom for a second, tall | Heels lifting off the floor > Put small plates under your heels or wear lifting shoes
n: Grip just outside shoulder width, or arms crossed if your wrists will not allow the clean grip. Bar resting on the shoulders, not held in the hands.
f: Practise the rack position with an empty bar before you add any weight. If your wrists complain, cross your arms over the bar for now.

#goblet-squat a:squat
p: A squat with one weight held at the chest. The easiest squat to learn and a great warm-up.
s: Hold one dumbbell upright at your chest, hands cupped under the top end | Feet a little wider than your hips, toes turned out slightly | Elbows pointing down, weight touching your chest
e: Breathe in and brace | Push your hips back a little and bend your knees | Sit down between your heels, keeping your chest up | Go down until your elbows brush the inside of your knees | Drive up through the whole foot | Squeeze your glutes at the top
c: Elbows inside the knees | Chest tall behind the weight | Push the floor away
m: Heels come up off the floor > Widen your stance a touch and sit your hips back | Knees cave in > Use your elbows to push your knees out at the bottom | The weight drifts away from the chest > Keep it pinned; that keeps your back upright
n: Feet a little wider than hips, toes out 15–30°. Dumbbell or kettlebell held against the chest.
f: Start with a light dumbbell and aim for a slow, deep, easy rep. Depth first, weight later.

#box-squat a:squat
p: A squat to a box. It teaches you to sit back and gives you the same depth every rep.
s: Set a box behind you so your thighs are level with the floor when you sit | Bar on the upper back as for a back squat | Feet a little wider than shoulder width, toes out
e: Breathe in and brace | Push your hips back and sit down onto the box | Touch the box gently, stay tight, pause for one second | Keep your shins close to vertical | Drive your feet into the floor and stand up
c: Sit back, not down | Touch and go, stay tight | Shins stay tall
m: Crashing down onto the box > Lower under control and touch it lightly | Relaxing on the box and rocking back > Stay braced; only your weight moves, not your trunk | Box too low for your hips > Raise it until you can sit without your lower back rounding
n: Box height so your hip crease is level with your knee when seated. Stance a little wider than shoulder width.
f: Start with a box you can sit on easily, then lower it a little at a time.

#hack-squat a:squat
p: A machine squat with your back supported. It lets your thighs work hard without much balance.
s: Stand on the platform with your back flat on the pad | Shoulders under the pads | Feet shoulder width, a little forward of your hips | Release the safety handles
e: Breathe in and brace | Bend your knees and let the sled slide down | Go down until your thighs are at least level with the platform | Keep your lower back on the pad | Push through the whole foot to straighten your legs | Stop just short of locking your knees
c: Back glued to the pad | Knees over the toes | Push the platform away
m: Lower back peels off the pad at the bottom > Stop a little higher, or move your feet further up the platform | Heels lifting off the platform > Move your feet higher up the platform | Knees snapping straight at the top > Stop just short of lockout
n: Feet shoulder width, mid-platform. Higher feet work the glutes more; lower feet work the thighs more.
f: Learn where the safety handles are before you start, and do a set with no plates first.

#leg-press a:squat
p: A machine that lets you push heavy weight with your legs while your back rests.
s: Sit with your back and hips flat on the pad | Feet shoulder width in the middle of the platform | Hold the handles at your sides | Push the platform up and release the safety catches
e: Breathe in | Bend your knees and let the platform come down slowly | Stop when your knees are near your chest, before your hips start to lift | Press through your whole foot to straighten your legs | Stop just short of locking your knees | Breathe out as you press
c: Hips stay on the seat | Press through the heels | Soft knees at the top
m: Lower back and hips curl off the seat at the bottom > Stop the rep higher; the seat should never let go of your hips | Locking the knees hard at the top > Stop just short of straight | Knees fall inwards > Keep them in line with your toes
n: Feet shoulder width, middle of the platform. Seat back set so your knees reach 90° or a little deeper without your hips lifting.
f: Find your depth with no weight: lower until your hips start to move, then set your reps to stop just above that.

#split-squat a:lunge
p: A lunge that stays in one place. It builds each leg on its own and shows up side-to-side gaps.
s: Hold a dumbbell in each hand | Take a long step forward; back heel lifted | Feet stay hip width apart, like standing on train tracks
e: Stand tall with most of your weight on the front foot | Drop straight down, back knee heading for the floor | Stop just above the floor | Push through the front heel to stand back up | Do all reps on one leg, then swap
c: Straight down, straight up | Front heel heavy | Hips square to the front
m: Stance too short, front knee shoots forward > Step the feet further apart | Wobbling side to side > Widen the tracks; hold a wall with one hand to start | Leaning forward a lot > Stay tall, as if a wall is in front of your face
n: Front foot about one long stride ahead of the back foot. Feet hip width apart side to side.
f: Start with no weights and a hand on a wall until you feel steady.

#bulgarian a:lunge
p: A split squat with the back foot on a bench. Hard, and one of the best single-leg exercises.
s: Stand about one stride in front of a bench | Rest the top of your back foot on the bench | Hold a dumbbell in each hand at your sides | Front foot flat, pointing forward
e: Brace and stand tall | Lower straight down on the front leg | Go until the front thigh is about level with the floor | Push through the front heel to rise | Finish all reps on one leg before swapping
c: Down like an elevator | Front heel heavy | Back leg just resting
m: Front foot too close to the bench > Hop it forward until the front shin stays near vertical at the bottom | Pushing off with the back leg > Keep the back foot light; the front leg does the work | Front knee caves in > Keep it over the middle toes
n: Bench at knee height. Front foot about 60–90 cm in front of the bench.
f: Try it with no weight and one hand on a rack first. Most people need a few tries to find their foot spot.

#lunge a:lunge
p: Stepping lunges that move you forward. Builds legs, balance and coordination.
s: Stand tall with a dumbbell in each hand | Clear space in front of you | Feet hip width apart
e: Take a long step forward | Drop your back knee towards the floor | Front shin stays close to upright | Push through the front heel and bring the back foot through | Step straight into the next lunge on the other leg
c: Long step, tall chest | Back knee kisses the floor | Push through the front heel
m: Short steps that drive the knee far past the toes > Lengthen your stride | Front knee caves in > Keep the knee over the middle toes | Stepping on a tightrope > Keep your feet hip width apart side to side
n: Stride about one leg length. Feet hip width apart side to side.
f: Start with bodyweight and slow steps. Add weights once you walk in a straight line.

#reverse-lunge a:lunge
p: A lunge where you step backwards. Easier on the knees and easier to balance than a forward lunge.
s: Stand tall, a dumbbell in each hand | Feet hip width apart | Weight in the middle of your feet
e: Step one foot a long way back | Lower the back knee towards the floor | Keep most weight in the front heel | Push through the front foot to step back up | Alternate legs, or do all reps on one side
c: Step back long | Front heel heavy | Chest tall
m: Stepping back too short > Reach further back with the moving foot | Falling onto the back knee > Lower under control and stop just above the floor | Leaning far forward > Stay tall through the whole rep
n: Step back about one leg length. Feet hip width apart side to side.
f: This is the lunge to learn first. Do it by a wall or rack for balance.

#step-up a:lunge
p: Stepping onto a box. It builds leg strength that carries over to stairs, hikes and running.
s: A sturdy box or bench about knee height | A dumbbell in each hand | Place your whole working foot on the box
e: Lean forward slightly over the top foot | Push through the top foot's heel to stand up on the box | Bring the other foot up, or let it hang | Lower back down slowly with the same leg | Finish all reps on one leg, then swap
c: The top leg does the work | Push through the heel | Stand tall at the top
m: Pushing off the floor with the bottom foot > Keep the bottom foot light, toes only | Knee caves in on the way up > Keep it over the middle toes | Dropping down fast > Lower in about two seconds
n: Box at knee height or a little lower. Whole foot on the box.
f: Start with a low step and no weight. Height is not the point; control is.

#leg-extension a:legmachine
p: A machine that trains the front of the thighs on their own.
s: Sit with your back against the pad | Line your knee up with the machine's pivot | Pad on the front of your lower shins, just above the ankles | Hold the side handles
e: Breathe out and straighten your legs | Squeeze the thighs hard at the top for a second | Lower slowly | Stop before the weight stack touches down | Repeat
c: Kick up and squeeze | Slow on the way down | Stay seated
m: Swinging the weight up > Lighten it and pause at the top | Hips lifting off the seat > Hold the handles and pull yourself down | Knee not lined up with the pivot > Move the back pad until the knee sits on the pivot's axis
n: Knee in line with the pivot. Shin pad just above the ankle. Back pad set so your thighs are fully on the seat.
f: Choose a light weight and use a slow count of three on the way down.

#sissy-squat a:bodyweight
p: A bodyweight squat that leans back and loads the front of the thighs hard.
s: Stand next to something sturdy to hold | Feet hip width apart | Rise onto your toes
e: Hold on lightly with one hand | Push your knees forward and lean your body back in one line | Keep your hips pushed forward, not sitting back | Lower until your knees are well past your toes | Drive your knees back to stand up
c: Knees forward, hips forward | One line from knees to head | Hold on lightly
m: Sitting the hips back like a normal squat > Keep your hips pushed forward over your knees | Going too deep too soon > Build range over weeks | Letting go of the support > Keep one hand on it; balance is not the goal
n: Feet hip width. Up on the balls of the feet the whole time.
f: Do half-range reps for the first few sessions. The thighs will be sore the first time.
x: Skip it if you have kneecap pain.

#deadlift a:hinge
p: Picking a loaded bar up from the floor. The biggest pull there is, for the whole back side of the body.
s: Bar over the middle of your feet, shins close to it | Feet hip width, toes forward or out a little | Hinge down and grip just outside your legs | Drop your hips until your shins touch the bar | Pull your chest up and your shoulder blades down
e: Take a big breath and brace | Pull the slack out of the bar until it clicks | Push the floor away, legs first | Keep the bar dragging up your legs | Stand tall with hips and knees locked together | Lower by pushing your hips back, then bending your knees once the bar passes them
c: Push the floor away | Bar stays on the legs | Chest up, back long
m: Lower back rounds off the floor > Take weight off, and set your back flat before the bar leaves the floor | Bar drifts forward away from the legs > Pull your armpits down; keep the bar brushing your legs | Jerking the bar off the floor > Pull the slack out first, then push | Leaning back at the top > Just stand tall and squeeze your glutes
n: Feet hip width. Grip just outside the shins. Bar over the middle of the foot at the start.
f: Start with light plates, or blocks under the plates, so the bar starts at mid-shin. Film one set from the side.

#rdl a:hinge
p: A hip hinge that starts from standing. The best exercise for the hamstrings under a stretch.
s: Stand tall holding the bar at your thighs | Feet hip width, knees soft | Grip just outside your thighs
e: Breathe in and brace | Push your hips back as far as they go | Let the bar slide down your thighs, knees staying soft | Stop when you feel a strong stretch in your hamstrings, usually just below the knee | Drive your hips forward to stand tall | Squeeze your glutes at the top
c: Hips back, not down | Bar on the legs | Long spine
m: Lower back rounds to reach lower > Stop at the stretch; depth comes from the hips, not the back | Bending the knees into a squat > Keep the knee angle almost fixed and push the hips back | Bar swinging away from the body > Keep it touching your legs all the way
n: Feet hip width. Grip just outside the thighs. Knees bent about 15–20° and kept there.
f: Practise pushing your hips back to touch a wall behind you. That is the whole movement.

#trap-bar a:hinge
p: A deadlift standing inside a hexagon bar. Easier to learn and easier on the back than the straight bar.
s: Stand in the middle of the bar | Feet hip width | Squat down and grip the handles in the middle | Hips a little lower than a normal deadlift, chest up
e: Breathe in and brace | Push the floor away with your legs | Stand up tall, hips and knees finishing together | Pause at the top | Lower by pushing hips back and bending knees together
c: Push the floor away | Stand tall | Arms are just ropes
m: Hips shoot up before the bar moves > Push with the legs first, chest and hips rising together | Rounding the back at the bottom > Start with the handles raised, or less weight | Standing off-centre in the bar > Line the handles up with the middle of your feet
n: Feet hip width, in the centre of the frame. Use the high handles to shorten the pull at first.
f: This is the easiest heavy pull to start with. Use the raised handles for the first weeks.

#stiff-leg a:hinge
p: A deadlift with almost straight legs. A long, strong stretch for the hamstrings.
s: Stand with the bar at your thighs | Feet hip width | Knees just unlocked
e: Brace | Hinge at the hips, keeping the knees nearly straight | Lower the bar along your legs | Stop when your hamstrings are fully stretched, before the back rounds | Drive the hips forward to stand
c: Hips back, legs long | Long spine | Bar close
m: Rounding the back to reach the floor > Stop at your stretch point | Locking the knees fully > Keep a tiny bend | Letting the bar drift away > Keep it touching the legs
n: Feet hip width, knees about 5–10° bent. Stop wherever your back would start to round.
f: Use light weight and a slow three-second lower. Expect sore hamstrings the next day.

#good-morning a:hinge
p: A hip hinge with the bar on your back. It trains the hamstrings and the muscles along the spine.
s: Bar on the upper back, as for a squat | Feet hip width | Knees soft
e: Breathe in and brace hard | Push your hips back and let your chest come forward | Keep your back flat and knees softly bent | Stop when your torso is near level with the floor, or at your stretch | Drive your hips forward to stand
c: Hips to the wall behind you | Long spine | Bow, don't crouch
m: Rounding the upper or lower back > Stop higher and use less weight | Bending the knees into a squat > Keep the knee bend small and fixed | Going too heavy > Treat it as an accessory; keep reps clean
n: Feet hip width. Knees bent about 15°. Light: start around a third of your squat.
f: Learn it with a broomstick on your back first.
x: Skip it during back pain. Keep the weight modest; this is not a max-effort lift.

#back-extension a:hinge
p: Hinging over a 45° bench. It trains the glutes, hamstrings and lower back safely.
s: Set the hip pad just below your hip crease | Hook your ankles under the rollers | Arms crossed on your chest or hands behind your head
e: Start with your body in one straight line | Bend at the hips and lower your chest towards the floor | Keep your back long | Drive your hips into the pad to come back up | Stop when your body is straight again, not arched
c: Hinge at the hips | Squeeze the glutes up | Straight line at the top
m: Arching back past straight at the top > Stop when your body is in line | Pad too high, so you can't bend at the hips > Lower it to just below the hip crease | Swinging up fast > Rise in about one second and pause
n: Pad just below the hip crease. Feet flat on the plate. Hold a plate to your chest to add weight.
f: Do bodyweight sets for a few sessions before holding any weight.

#leg-curl a:legmachine
p: Lying face down and curling your heels to your glutes. It trains the hamstrings on their own.
s: Lie face down with your knees just off the end of the pad | Pad on the back of your lower legs, just above the heels | Hold the handles
e: Press your hips into the pad | Curl your heels towards your glutes | Squeeze at the top for a second | Lower slowly until your legs are almost straight | Repeat without resting at the bottom
c: Hips down | Heels to glutes | Slow down
m: Hips lift off the pad > Lighten the weight and press the hips down | Kicking the weight up > Curl smoothly and pause at the top | Dropping the weight > Take three seconds to lower
n: Knees just off the pad edge, in line with the pivot. Roller just above the heels.
f: Start light. Hamstrings cramp easily at first; that settles with practice.

#seated-curl a:legmachine
p: A leg curl done sitting. The hamstrings work from a longer stretch than lying down.
s: Sit with your back against the pad | Knees lined up with the pivot | Leg pad above your heels, thigh pad locked down on top of the knees | Hold the handles
e: Curl your heels down and under the seat | Squeeze at the bottom | Let your legs return slowly until almost straight | Keep your hips pinned the whole time
c: Heels under the seat | Hips pinned | Slow return
m: Thigh pad left loose, so the hips lift > Lock the pad down snug on your thighs | Short, fast reps > Use the full range and control the return | Pulling with the arms > Hold lightly; the legs do the work
n: Knee on the pivot axis. Thigh pad tight just above the knees. Leg pad above the heels.
f: Set the thigh pad properly before your first rep; it makes the exercise.

#nordic a:bodyweight
p: Lowering your body forward from kneeling. One of the hardest hamstring exercises there is, and good for injury prevention.
s: Kneel on a pad | Have a partner hold your ankles, or hook them under something heavy | Body straight from knees to head | Hands ready in front of your chest
e: Brace your glutes and stomach | Lean forward slowly from the knees in one straight line | Fight the fall with your hamstrings as long as you can | Catch yourself with your hands | Push back up lightly with your hands and return
c: One straight line | Fight the fall | Catch soft
m: Bending at the hips to cheat > Keep hips pushed forward in line | Dropping fast early > Go only as far as you can control | Too many reps too soon > Three to five slow reps is plenty at first
n: Pad under the knees. Ankles firmly anchored. Two or three sets of three to five.
f: Expect to control only the first part of the fall. Use a band around your chest for help if you have one.
x: Very hard on the hamstrings. Build up slowly and never do them the day before sprinting.

#hip-thrust a:glute
p: Driving the hips up with a bar across them. The strongest glute exercise.
s: Sit on the floor with your upper back against a bench | Roll the bar over your legs to your hip crease; use a pad | Feet flat, shoulder width, knees bent | Bench edge just under your shoulder blades
e: Tuck your chin a little and brace | Drive through your heels and lift your hips | Finish with your body flat from shoulders to knees | Squeeze your glutes hard for a second | Lower under control
c: Ribs down, chin tucked | Drive through the heels | Squeeze at the top
m: Arching the lower back at the top > Keep ribs down and stop when hips are level with knees | Feet too far out, so the hamstrings take over > Bring feet in until shins are vertical at the top | Pushing through the toes > Drive through the heels
n: Bench about knee height, edge under the shoulder blades. Shins vertical at the top. Pad on the bar.
f: Learn it with bodyweight, then a plate, before a loaded bar.

#glute-bridge a:glute
p: Lifting your hips from the floor. The simplest way to wake up and train the glutes.
s: Lie on your back | Knees bent, feet flat, hip width, heels close to your bottom | Arms long by your sides
e: Flatten your lower back gently | Push through your heels to lift your hips | Stop when your body makes a line from shoulders to knees | Squeeze your glutes for two seconds | Lower slowly
c: Heels into the floor | Squeeze, don't arch | Ribs down
m: Arching the lower back to lift higher > Stop when your hips line up with your knees | Feeling it mostly in the hamstrings > Bring your feet closer to your bottom | Rushing through the reps > Hold each top position for two full seconds
n: Feet hip width, heels about a hand's length from your bottom.
f: Great as a warm-up before squats and deadlifts.

#cable-kickback a:glute
p: Kicking one leg back against a cable. It isolates the glutes.
s: Put an ankle cuff on and clip it to a low pulley | Face the stack and hold the frame | Lean forward slightly | Stand on the other leg with a soft knee
e: Brace your stomach | Push the working leg back and slightly up | Squeeze the glute at the end | Stop before your lower back arches | Return slowly
c: Heel pushes back | Hips stay square | Squeeze, don't swing
m: Arching the lower back to kick higher > Stop when the leg is just behind you | Swinging with momentum > Slow down and pause at the end | Twisting the hips open > Keep both hip bones facing the stack
n: Low pulley. Ankle cuff. Lean about 15–20°.
f: Use a light weight; this exercise needs a feel, not a load.

#abduction a:legmachine
p: Pushing your knees apart on a machine. It trains the outer glutes that steady your hips.
s: Sit with your back against the pad | Pads on the outside of your knees | Hold the handles
e: Push your knees apart | Pause at the widest point | Let them come back slowly | Stop before the weights touch
c: Knees out | Pause wide | Slow back
m: Letting the weight snap back > Control the return | Rocking the body to move it > Stay pinned to the seat | Very short range > Use a lighter weight and full range
n: Start with the pads at a comfortable width. Lean slightly forward to feel more of the glutes.
f: This is a finisher. Twelve to twenty smooth reps.

#calf-raise a:calf
p: Rising onto your toes against a load. The main calf builder.
s: Stand with the balls of your feet on the step edge | Shoulders under the pads | Heels hanging off, knees straight but soft
e: Lower your heels as far as they go | Pause in the stretch | Rise up onto your toes as high as you can | Hold at the top for a second | Lower slowly
c: All the way down | All the way up | Pause at both ends
m: Bouncing out of the bottom > Pause for a full second in the stretch | Bending the knees to push > Keep the knees still | Short, fast reps > Slow down and use the whole range
n: Balls of the feet on the edge. Knees straight but not locked.
f: Calves respond to slow, full reps. Start with bodyweight on a step.

#seated-calf a:calf
p: A calf raise seated with bent knees. It works the deeper calf muscle.
s: Sit with the pad on your thighs just above the knees | Balls of the feet on the step | Release the lock
e: Lower your heels as far as they go | Pause | Push up onto your toes | Hold at the top | Lower slowly
c: Deep stretch | High on the toes | Slow and steady
m: Bouncing at the bottom > Pause in the stretch | Using the hands to lift > Hands just rest on the pad | Only moving halfway > Use the full range
n: Knee pad just above the knees. Balls of the feet on the edge.
f: Use a slow count of two up and two down.
`;

export const TEXT_PRESS = `
#bench a:press
p: Pressing a bar from the chest while lying on a bench. The main upper-body strength lift for the chest, shoulders and triceps.
s: Lie with your eyes under the bar | Feet flat on the floor, a little behind your knees | Squeeze your shoulder blades together and down, small arch in the upper back | Grip so your forearms are vertical when the bar touches your chest
e: Unrack the bar and hold it over your shoulders | Breathe in and lower the bar to your lower chest | Elbows about 45° from your body | Touch the chest lightly | Press up and slightly back over the shoulders | Lock out and breathe
c: Bend the bar | Shoulder blades pinned | Feet drive into the floor
m: Hips lift off the bench > Push through your feet towards your head, not up; keep your glutes down | Elbows flared straight out > Tuck them to about 45° | Bouncing the bar off the chest > Touch lightly and press | Wrists bent back > Stack the bar over your forearms
n: Grip about 1.5× shoulder width. Eyes under the bar. Safety arms just below chest height.
f: Use the empty bar, and have someone spot you or set the safety arms. Practise the unrack and rerack.
x: Always bench with a spotter or safety arms. Don't use a thumbless grip.

#incline-bench a:press
p: A bench press on a raised bench. More work for the upper chest and the front of the shoulders.
s: Set the bench to about 30° | Sit back with your eyes under the bar | Shoulder blades squeezed together | Grip a little wider than shoulder width
e: Unrack and hold the bar over your shoulders | Lower to the upper chest, just below the collarbone | Elbows at about 45° | Press straight up | Lock out
c: Bar to the collarbone | Shoulder blades pinned | Press straight up
m: Hips sliding forward off the seat > Plant your feet and set the seat stop | Bench too steep, so it becomes a shoulder press > Lower it to about 30° | Elbows flared straight out > Tuck them to about 45° from your body
n: Bench at 30°. Grip a little wider than shoulder width. Bar touches just below the collarbone.
f: Start with dumbbells or the empty bar while you learn the bar path.
x: Use safety arms or a spotter.

#decline-bench a:press
p: A bench press with the head lower than the hips. It targets the lower chest with a short range.
s: Hook your legs under the rollers | Lie back with your eyes under the bar | Shoulder blades pinned | Grip about 1.5× shoulder width
e: Unrack with a spotter's help | Lower to the lower chest | Touch lightly | Press straight up | Lock out
c: Bar to the lower chest | Stay tight | Controlled lower
m: Bar drifting towards the face > Aim for the lower chest | Unracking alone from a deep decline > Always use a spotter | Bouncing off the chest > Touch and press
n: Decline of about 15–20°. Grip about 1.5× shoulder width.
f: Only with a spotter. Blood rushes to the head, so sit up slowly between sets.
x: Always with a spotter. Skip it if you have high blood pressure or get dizzy lying head-down.

#db-bench a:press
p: A bench press with dumbbells. A longer range and each arm works on its own.
s: Sit on the bench with the dumbbells on your thighs | Lie back and bring them to your chest | Feet flat, shoulder blades pinned | Palms facing your feet or angled slightly in
e: Press the dumbbells up over your chest | Lower slowly to chest level | Elbows at about 45° | Press up again | Bring them close at the top without clanging
c: Elbows under the wrists | Deep and slow | Press up and in
m: Hips come up as the arms push > Keep the glutes on the bench and feet planted | Dropping them to the floor at the end with arms straight > Bring them to your chest, then sit up | Elbows flare out wide > Tuck to about 45°
n: Flat bench. Dumbbells at chest level at the bottom, forearms vertical.
f: Learn to kick the dumbbells up with your knees to get into position.

#db-incline a:press
p: An incline press with dumbbells. Upper chest and shoulders with a free path for each arm.
s: Bench at 30° | Sit with the dumbbells on your thighs, then kick them up to your shoulders | Palms facing forward or slightly in | Shoulder blades pinned
e: Press the dumbbells up over the upper chest | Lower slowly until they are beside the upper chest | Keep the elbows under the wrists | Press again
c: Up and slightly in | Slow on the way down | Chest up
m: Arching off the bench > Keep the upper back on the pad | Bench too steep > Keep it around 30° | Dumbbells drifting too far apart > Press up along a gentle arc
n: Bench at 30°. Neutral or slightly angled grip.
f: Start lighter than you think; the incline feels harder than flat.

#chest-press a:press
p: A seated machine chest press. Heavy pushing with the path set for you.
s: Set the seat so the handles are level with your mid-chest | Back flat on the pad | Grip the handles, elbows at about 45°
e: Breathe in | Press the handles forward until your arms are straight | Stop just short of locking | Let the handles come back slowly | Stop before the weight touches
c: Shoulder blades back | Press through the palms | Slow back
m: Shoulders roll forward at the end > Keep your back and shoulders on the pad | Seat too low, pressing upward > Raise it until the handles line up with mid-chest | Letting the stack crash > Control the return
n: Handles at mid-chest height. Elbows about 45° from your body.
f: A good place to learn pressing without balancing a bar.

#cable-fly a:raise
p: Bringing your hands together in front of you against cables. It trains the chest on its own with steady tension.
s: Set both pulleys around shoulder height | Hold a handle in each hand | Step forward into a split stance | Soft bend in the elbows
e: Start with your arms open wide | Hug the air, bringing the hands together in front of your chest | Squeeze your chest for a second | Open back up slowly until you feel a stretch
c: Hug a big tree | Elbows stay soft | Squeeze the chest
m: Bending the elbows more to press it > Keep the same small bend the whole rep | Opening too far, shoulders hurt > Stop at a comfortable stretch | Leaning into it with the body > Stay still; only the arms move
n: Pulleys about shoulder height. Split stance, one foot forward.
f: Use a light weight and slow reps. It is for feel, not load.

#pec-deck a:raise
p: Closing padded arms in front of you. A simple, safe chest isolation.
s: Set the seat so your upper arms are level with your shoulders | Forearms or hands on the pads | Back flat against the pad
e: Bring the pads together in front of your chest | Squeeze for a second | Let them open slowly | Stop at a comfortable stretch
c: Elbows lead | Squeeze | Slow open
m: Shoulders roll forward > Keep your chest up and back on the pad | Letting the pads fly open > Control the stretch | Seat too high or low > Line the handles up with your chest
n: Seat set so the pads line up with the middle of your chest.
f: Start light. Focus on feeling the squeeze.

#pushup a:press
p: The classic bodyweight press. Chest, shoulders and triceps, with a strong trunk.
s: Hands on the floor, a little wider than your shoulders | Walk your feet back until your body is straight | Squeeze your glutes and brace your stomach
e: Lower your chest towards the floor | Elbows at about 45° | Stop just above the floor | Push the floor away to straighten your arms | Keep the body straight throughout
c: Push the floor away | One straight line | Elbows back, not out
m: Hips sagging towards the floor > Squeeze your glutes and brace harder | Elbows flared straight out > Tuck them to about 45° | Stopping halfway down > Lower your chest to the floor, or use a bench to make it easier
n: Hands just wider than your shoulders, under your chest. Feet together or hip width.
f: If a full push-up is too hard, do them with your hands on a bench. Lower the bench over time.

#dip a:press
p: Lowering and pushing your body between parallel bars. Chest and triceps.
s: Grip the bars and jump up to straight arms | Shoulders pushed down, away from your ears | Bend your knees and cross your feet behind you
e: Lean forward slightly | Lower by bending your elbows | Stop when your shoulders are level with your elbows | Push back up to straight arms | Keep your shoulders down
c: Shoulders down, chest up | Elbows back | Stop at level
m: Going too deep > Stop when shoulders reach elbow height | Shoulders shrug up to the ears > Push down through the bars | Swinging the legs > Keep them still and crossed
n: Bars about shoulder width. Lean forward about 20° for chest, more upright for triceps.
f: Start with an assisted machine or a band under your knees.
x: Skip them if the front of your shoulder hurts.

#ohp a:press
p: Pressing a bar from your shoulders to overhead while standing. The main shoulder strength lift.
s: Bar in the rack at collarbone height | Grip just outside your shoulders | Elbows slightly in front of the bar | Step back, feet hip width
e: Squeeze your glutes and brace your stomach | Tilt your head back a little and press the bar straight up | Once it passes your forehead, bring your head through | Lock out with the bar over the middle of your foot | Lower back to your collarbone
c: Squeeze your glutes | Head through the window | Biceps by the ears
m: Leaning back hard to push > Squeeze glutes, brace, and use less weight | Bar travelling forward around the face > Move your head back and press straight up | Elbows flared wide at the start > Keep them slightly in front of the bar
n: Grip just outside shoulder width. Feet hip width. Bar finishes over mid-foot.
f: Learn it with the empty bar. It is normal for this lift to move up slowly.

#push-press a:power
p: An overhead press helped by a quick dip and drive of the legs. More weight overhead, and power.
s: Bar at the collarbone, as for a press | Grip just outside the shoulders | Feet hip width
e: Brace | Dip a few centimetres by bending your knees, torso upright | Drive up hard through your legs | Use that push to punch the bar overhead | Lock out and stand still | Lower the bar to your shoulders, bending the knees a little to soften it
c: Short dip, fast drive | Straight down, straight up | Punch the ceiling
m: Dipping too deep or leaning forward > Keep the dip short and the chest upright | Pressing before the legs finish > Let the legs throw the bar first | Pausing between dip and drive > Make it one smooth bounce
n: Dip about 10 cm. Grip just outside shoulder width.
f: Learn the strict press first.

#db-press a:press
p: Pressing two dumbbells overhead, often seated. Shoulders and triceps, each arm on its own.
s: Bench set upright | Sit tall with the dumbbells at shoulder height | Palms forward, elbows under the wrists
e: Brace | Press the dumbbells up until your arms are straight | Bring them close over your head | Lower slowly to ear height
c: Wrists over elbows | Press up and in | Back on the pad
m: Arching the lower back > Keep your back on the pad and ribs down | Lowering only halfway > Bring them to ear height | Elbows flared behind the body > Keep them slightly in front
n: Bench upright or one notch back. Dumbbells start at ear height.
f: Start light and slow. Balance improves quickly.

#arnold a:press
p: A dumbbell press that turns your palms as you go. Works all three parts of the shoulder.
s: Sit tall with the dumbbells in front of your shoulders | Palms facing you, elbows in front | Back against the pad
e: Start pressing up | Open your elbows out to the sides as you rotate your palms forward | Finish overhead, palms forward | Reverse the turn on the way down
c: Turn and press | Smooth rotation | Finish tall
m: Rushing the turn > Rotate evenly through the whole press | Arching the back > Keep ribs down | Going too heavy > Use lighter weights than your normal press
n: Seated with back support. Start with palms facing you at chin height.
f: Practise the rotation with no weight first.

#lateral-raise a:raise
p: Raising dumbbells out to the sides. The best exercise for wider-looking shoulders.
s: Stand tall with a dumbbell in each hand at your sides | Slight bend in the elbows | Lean forward very slightly
e: Raise your arms out to the sides | Lead with your elbows | Stop when your hands reach shoulder height | Lower slowly
c: Lead with the elbows | Pour the jug | Stop at shoulder height
m: Raising well above the shoulders > Stop at shoulder height; above that the traps take over | Swinging the body to lift > Use lighter weights and slow down | Shrugging up to the ears > Keep the shoulders down
n: Light dumbbells. Arms slightly in front of the body, elbows a little bent.
f: Start much lighter than you think. Two or three kilos is normal.

#cable-lateral a:raise
p: A lateral raise with a cable across your body. Steady tension from the very bottom.
s: Set a pulley at the lowest point | Stand side-on to the stack | Hold the handle with the far hand, cable crossing in front of you | Hold the frame with the other hand
e: Raise your arm out to the side | Stop at shoulder height | Pause | Lower slowly across your body
c: Lead with the elbow | Stay tall | Slow down
m: Leaning away to lift > Stand tall and use less weight | Going above the shoulder > Stop at shoulder height | Bending the elbow more as you lift > Keep the same slight bend
n: Low pulley. Stand about a step away from the stack.
f: One arm at a time lets you really feel it. Start light.

#front-raise a:raise
p: Raising the arms in front of you. It works the front of the shoulders.
s: Stand tall with dumbbells in front of your thighs | Palms facing your legs | Slight bend in the elbows
e: Raise your arms forward to shoulder height | Pause | Lower slowly | Keep your body still
c: Arms long | Stop at eye level | Stay still
m: Leaning back and swinging > Brace and use lighter weights | Raising above head height > Stop at shoulder or eye level | Rushing the lowering > Take two seconds down
n: Light dumbbells or one plate held with both hands.
f: Presses already train the front shoulder, so a few sets here go a long way.

#rear-delt-fly a:raise
p: Raising the arms out to the side while bent over. It trains the back of the shoulders.
s: Hinge forward until your chest faces the floor | Knees soft, back flat | Dumbbells hanging under your chest, palms facing each other
e: Raise your arms out to the sides | Lead with your little fingers | Squeeze the back of your shoulders | Lower slowly
c: Arms out wide | Pinkies lead | Keep the hinge
m: Standing up as you lift > Hold the same hinge through the set | Squeezing the shoulder blades hard, turning it into a row > Keep the arms wide and the elbows soft | Using too much weight > Go light and slow
n: Torso about level with the floor. Light dumbbells.
f: You can rest your forehead on a bench set at an incline to hold the position.

#face-pull a:pull
p: Pulling a rope towards your face with the elbows high. Great for the back of the shoulders and shoulder health.
s: Set the pulley at forehead height with a rope | Hold the rope with thumbs facing back | Step back until your arms are straight | Stagger your feet
e: Pull the rope towards your face | Keep your elbows high | Pull the ends apart beside your ears | Squeeze for a second | Return slowly
c: Elbows high | Pull the rope apart | Show your biceps
m: Elbows drop, turning it into a row > Keep them at shoulder height | Leaning back to pull > Stand tall and lighten it | Stopping the pull short > Finish with your hands beside your ears
n: Pulley at forehead height. Rope attachment.
f: A good warm-up before pressing. Light and smooth.

#upright-row a:pull
p: Pulling a bar up the front of your body, elbows high. Shoulders and upper traps.
s: Stand tall holding a bar at your thighs | Grip about shoulder width | Arms straight
e: Pull the bar up, leading with your elbows | Keep the bar close to your body | Stop when your elbows reach shoulder height | Lower slowly
c: Elbows lead | Bar close | Stop at shoulder height
m: Pulling the bar to the chin with a narrow grip > Grip wider and stop at the lower chest | Swinging the body > Brace and use less weight | Pain in the front of the shoulder > Stop the set and switch to lateral raises
n: Grip shoulder width or a little wider. Stop with the elbows at shoulder height.
f: Use a wide grip and a short range to start.
x: Skip it if raising your arms makes your shoulder pinch.
`;

export const TEXT_PULL = `
#row a:pull
p: Rowing a bar to your body while bent over. A heavy back builder that also trains you to hold a hinge.
s: Stand with the bar at your thighs, grip just outside your legs | Push your hips back until your torso is at about 45° | Knees soft, back flat | Let the bar hang under your shoulders
e: Brace | Pull the bar to your belly button | Drive your elbows back past your body | Squeeze your shoulder blades together | Lower slowly to straight arms | Keep the torso angle fixed
c: Elbows to the back pocket | Torso stays still | Squeeze the shoulder blades
m: Standing up more with every rep > Keep the same torso angle; lighten the bar | Jerking the bar with the hips > Row with the arms and back only | Rounding the back > Brace harder and use less weight
n: Torso about 45°. Grip just wider than shoulder width. Bar travels to the belly button.
f: Start light and pause each rep at the top.

#pendlay a:pull
p: A strict row from the floor with the torso level. Each rep starts from a dead stop.
s: Bar on the floor over the middle of your feet | Hinge until your torso is almost level | Grip a little wider than shoulder width | Back flat, knees bent
e: Brace | Pull the bar explosively to your lower chest | Keep your torso still | Lower the bar back to the floor | Let it settle before the next rep
c: Flat back, flat table | Rip it to the chest | Reset every rep
m: Torso rising as you pull > Keep your chest down; lighten the bar | Bouncing reps off the floor > Let the bar stop each time | Rounding the lower back > Keep it flat; raise the bar on blocks if needed
n: Torso nearly level with the floor. Grip a little wider than shoulder width.
f: Needs good hamstring flexibility. Use blocks under the plates if you cannot reach with a flat back.

#db-row a:pull
p: Rowing one dumbbell with a hand and knee on a bench. Each side of the back on its own.
s: One hand and the same-side knee on a flat bench | Other foot on the floor, out to the side | Back flat, like a table top | Dumbbell hanging from a straight arm
e: Pull the dumbbell up to your hip | Lead with your elbow, keep it close to your side | Squeeze at the top | Lower until your arm is straight | Finish one side, then switch
c: Elbow to the hip | Shoulders square | Pause at the top
m: Twisting the torso or standing up to heave it > Keep shoulders square to the floor and lighten it | Pulling to the shoulder > Pull towards the hip | Dropping the weight fast > Take two seconds to lower
n: Flat bench. Supporting hand under the shoulder, knee under the hip.
f: Start with a weight you can pause at the top for one second.

#chest-row a:pull
p: Rowing dumbbells with your chest on an incline bench. Your back is supported, so the target muscles do all the work.
s: Set a bench to about 30–45° | Lie face down with your chest on the pad | Feet on the floor behind you | Dumbbells hanging straight down
e: Row both dumbbells up | Drive the elbows back | Squeeze your shoulder blades together | Lower slowly to straight arms
c: Chest stays on the pad | Elbows back | Squeeze and hold
m: Lifting the chest off the pad to cheat > Keep it glued down | Shrugging the shoulders up > Pull the elbows back, not up | Stopping short at the bottom > Let the arms straighten fully each rep
n: Bench at 30–45°. Chest near the top of the pad.
f: A safe row for anyone whose lower back gets tired on bent-over rows.

#cable-row a:pull
p: Pulling a cable to your belly while seated. Easy on the lower back and good for mid-back thickness.
s: Sit with your feet on the plate, knees slightly bent | Hold the handle with straight arms | Sit tall, chest up
e: Pull the handle to your belly | Drive your elbows back close to your sides | Squeeze your shoulder blades together | Let your arms straighten and your shoulders reach forward | Keep your back tall throughout
c: Sit tall | Elbows past the ribs | Squeeze, then reach
m: Rounding forward to reach, then heaving back > Keep the torso nearly still; only the arms and shoulder blades move | Leaning way back to finish > Stop at upright | Shrugging the shoulders > Keep them down
n: Knees slightly bent. V-handle for a close grip, bar for a wide grip.
f: Start with a light stack and feel the shoulder blades move.

#pulldown a:pull
p: Pulling a bar down to your chest while seated. Builds the lats and the path to your first pull-up.
s: Set the knee pad so your thighs are locked in | Grip the bar a little wider than shoulder width | Sit down with arms straight | Lean back very slightly
e: Pull your shoulder blades down first | Pull the bar to your upper chest | Drive your elbows down to your sides | Pause | Let the bar rise slowly to straight arms
c: Elbows to your pockets | Chest up to the bar | Slow on the way up
m: Leaning far back to heave it > Keep a small lean and use less weight | Pulling behind the neck > Pull to the front of the chest | Arms only, shoulders shrugged > Start each rep by pulling the shoulders down
n: Grip about 1.5× shoulder width. Knee pad snug on the thighs.
f: Aim for three sets of ten with a slow return before adding weight.

#pullup a:pull
p: Pulling your body up to a bar. The best bodyweight back exercise.
s: Grip a bar with palms facing away | Hands a little wider than shoulder width | Hang with straight arms, legs slightly in front
e: Pull your shoulder blades down | Pull up until your chin clears the bar | Drive your elbows down to your sides | Lower slowly to a full hang
c: Chest to the bar | Elbows to the ribs | Full hang each rep
m: Half reps from bent arms > Lower to straight arms each rep | Kicking and swinging > Keep the body still | Chin craning to reach > Pull the chest up instead
n: Grip about 1.5× shoulder width. Palms facing away.
f: Start with slow lowering only, or a band for help. Five good reps is a great milestone.

#chinup a:pull
p: A pull-up with palms facing you. The biceps help more, so most people can do more reps.
s: Grip the bar with palms facing you, shoulder width | Hang with straight arms | Legs still
e: Pull your shoulders down | Pull up until your chin clears the bar | Squeeze | Lower slowly to a full hang
c: Chest up | Elbows down | Full hang
m: Swinging to get up > Keep the legs still and slow down | Not lowering fully > Straighten the arms each rep | Shrugging at the bottom > Keep the shoulders down
n: Grip shoulder width, palms facing you.
f: Often the first bodyweight pull people can do. Try slow negatives if you can't do one yet.

#straight-arm a:pull
p: Pulling a cable down with straight arms. The lats work without the biceps helping.
s: Set a pulley high with a bar or rope | Step back and hinge forward slightly | Arms straight, reaching up to the bar
e: Keep your arms straight | Sweep the bar down to your thighs | Squeeze your lats at the bottom | Let the bar rise slowly
c: Long arms | Sweep to the thighs | Feel the armpits work
m: Bending the elbows to push it down > Keep a fixed slight bend | Using the body to heave > Stay still in the hinge | Letting the bar yank up > Control the return
n: High pulley. Hinge about 20–30°.
f: Use a light weight; a great warm-up for pull-ups.

#shrug a:pull
p: Lifting your shoulders straight up. It trains the upper traps.
s: Stand tall holding heavy dumbbells at your sides | Arms long and relaxed, like hooks | Feet hip width, knees soft
e: Lift your shoulders straight up to your ears | Hold for a second | Lower slowly | Don't roll the shoulders
c: Shoulders to the ears | Pause | Straight up and down
m: Rolling the shoulders round > Move straight up and down | Bending the elbows > Keep the arms long, like hooks | Moving only a little > Lift as high as you can and lower fully
n: Heavy dumbbells or a trap bar. Arms at your sides.
f: Pause at the top for one to two seconds.

#curl a:arm
p: Curling a bar up with your elbows still. The classic biceps builder.
s: Stand tall with the bar at your thighs | Grip shoulder width, palms facing forward | Elbows at your sides
e: Curl the bar up towards your shoulders | Keep your elbows by your ribs | Squeeze at the top | Lower slowly to straight arms
c: Elbows pinned | Squeeze at the top | Slow down
m: Swinging the body to get the bar up > Stand still and use a lighter bar | Elbows drifting forward > Keep them at your sides | Stopping short of straight arms > Lower all the way
n: Grip shoulder width. EZ bar if a straight bar hurts your wrists.
f: Start with the empty bar or light dumbbells.

#db-curl a:arm
p: Curling dumbbells, turning the palms up as you go. The biceps work fully with a free wrist.
s: Stand tall with dumbbells at your sides | Palms facing your legs | Elbows close to your ribs
e: Curl the dumbbells up | Turn your palms up as they rise | Squeeze at the top | Lower slowly, turning the palms back
c: Turn and curl | Elbows still | Slow down
m: Swinging the body to get them up > Use less weight and stand still | Elbows moving forward > Keep them at your sides | Dropping them fast > Take two seconds to lower
n: Both arms together or one at a time.
f: One arm at a time is easier to control at first.

#hammer-curl a:arm
p: A curl with palms facing each other. It trains the biceps and the thick forearm muscle.
s: Stand tall with dumbbells at your sides | Palms facing each other | Elbows close to the ribs
e: Curl the dumbbells up, palms facing in | Keep your elbows by your ribs | Stop near the shoulder and squeeze | Lower slowly to straight arms
c: Thumbs up | Elbows still | Slow down
m: Swinging the weights up > Stand still and lighten them | Elbows moving forward > Pin them to your sides | Stopping short at the bottom > Lower all the way to straight arms
n: Neutral grip, thumbs up.
f: Often stronger than a normal curl; still keep it strict.

#incline-curl a:arm
p: A curl lying back on an incline bench. The arms hang behind you, so the biceps work from a long stretch.
s: Set the bench to about 45–60° | Lie back with a dumbbell in each hand | Let the arms hang straight down | Palms facing forward
e: Curl the dumbbells up without moving your upper arms | Turn your palms up as they rise | Squeeze at the top | Lower all the way to a full stretch
c: Arms hang back | Curl without swinging | Full stretch
m: Upper arms swinging forward > Keep them hanging straight down | Lifting the head and shoulders off the bench > Stay back on the pad | Going too heavy > Use lighter dumbbells than a standing curl
n: Bench at 45–60°. Light dumbbells.
f: Expect to use lighter weights here. The stretch is the point.

#preacher a:arm
p: A curl with the upper arms on an angled pad. It keeps the elbows still and works the biceps at the bottom.
s: Sit so your armpits are over the top of the pad | Rest the backs of your upper arms on the pad | Grip the bar shoulder width, palms up
e: Curl the bar up towards your chin | Squeeze | Lower slowly until your arms are almost straight | Stop just short of locking
c: Arms glued to the pad | Slow at the bottom | Don't lock out
m: Dropping the weight into a locked elbow > Control the last part and stop just short | Lifting the elbows off the pad > Keep the upper arms down | Leaning back to lift > Stay forward over the pad
n: Seat set so your armpits are over the top edge of the pad.
f: Go light; the bottom of the range is the hardest part.

#cable-curl a:arm
p: Curling a cable from a low pulley. The biceps are under tension the whole rep.
s: Set a pulley low with a bar or rope | Stand a step back from the stack | Elbows at your sides
e: Curl the handle up towards your shoulders | Keep your elbows by your ribs | Squeeze at the top | Lower slowly to straight arms
c: Elbows pinned | Squeeze the top | Slow down
m: Leaning back to lift > Stand tall and use less weight | Elbows drifting forward > Keep them at the ribs | Rushing the lowering > Take two seconds to lower
n: Low pulley. Straight bar, EZ bar or rope.
f: Great for higher reps at the end of a workout.

#pushdown a:arm
p: Pushing a cable down with your elbows at your sides. The main triceps isolation.
s: Set a pulley high with a bar or rope | Stand close, lean forward very slightly | Elbows pinned to your ribs
e: Push the handle down until your arms are straight | Squeeze your triceps | Let it come back up slowly | Stop when your forearms are just past level
c: Elbows glued to the ribs | Straighten fully | Slow back up
m: Elbows drift forward and the shoulders help > Keep the upper arms still at your sides | Leaning over the weight > Stand tall and lighten it | Letting the handle come up too high > Stop around chest height
n: High pulley. Rope, straight bar or V-bar.
f: Start light and aim for a strong squeeze at the bottom.

#overhead-triceps a:arm
p: Straightening your arms overhead with a dumbbell. It trains the long head of the triceps under a stretch.
s: Sit or stand tall | Hold one dumbbell with both hands under the top plate | Press it overhead
e: Lower the dumbbell behind your head by bending your elbows | Keep your upper arms close to your head | Go until you feel a deep stretch | Straighten your arms to lift it back up
c: Elbows point up | Deep stretch | Straighten fully
m: Elbows flaring wide > Keep them pointing forward and in | Arching the lower back > Brace, or sit with back support | Using more weight than you can control > Lighten it until the bottom feels steady
n: One dumbbell held with both hands. Seated with back support is easier.
f: Start light. The stretch is intense the first time.

#skullcrusher a:arm
p: Lowering a bar towards your forehead while lying down. A strong triceps builder.
s: Lie on a flat bench holding an EZ bar over your chest | Arms straight up | Grip about shoulder width
e: Lean your arms back slightly towards your head | Bend your elbows to lower the bar towards your forehead | Keep your elbows pointing up | Straighten your arms to lift the bar | Stop over your forehead, not your chest
c: Elbows point up | Lower to the forehead | Straighten fully
m: Elbows flaring out > Keep them in line with your shoulders | Moving the upper arms like a pullover > Keep them still | Going too heavy > Stay light; elbows dislike heavy loads here
n: EZ bar. Grip about shoulder width. Upper arms slightly tilted back.
f: Go light and slow. Bring the bar towards the top of your head rather than your nose.

#cgbp a:press
p: A bench press with a narrower grip. More triceps work, with heavy weight.
s: Lie on the bench, eyes under the bar | Grip about shoulder width | Shoulder blades pinned
e: Unrack | Lower the bar to your lower chest | Keep your elbows close to your body | Press up | Lock out
c: Elbows tucked | Touch the lower chest | Press through the palms
m: Hips lifting off the bench > Keep your glutes down and push through your feet | Grip so narrow the wrists bend > Keep your hands about shoulder width | Elbows flaring out wide > Tuck them close to your body
n: Grip shoulder width. Elbows close to the body.
f: Use the same set-up as your bench press.
x: Use safety arms or a spotter.

#kickback a:arm
p: Straightening your arm behind you while bent over. The triceps work hard at full contraction.
s: Hinge forward with a flat back | Upper arm tucked to your side, level with your torso | Dumbbell hanging, elbow bent at 90°
e: Straighten your arm back until it is straight | Squeeze the triceps | Lower the forearm slowly | Keep the upper arm still
c: Upper arm still | Straighten fully | Squeeze
m: Upper arm dropping as you tire > Keep it level with your torso and lighten the weight | Swinging the weight up > Move slowly and pause at the top | Rounding the back > Keep the hinge flat
n: Hinge about 60–80°. Light dumbbell.
f: Use a bench for support with one hand to start.

#wrist-curl a:arm
p: Curling your wrists with your forearms resting. It builds the forearms and grip.
s: Sit with your forearms resting on your thighs | Hands just past your knees | Palms up, holding dumbbells
e: Let the dumbbells roll down to your fingertips | Curl your wrists up as high as you can | Squeeze | Lower slowly
c: Forearms stay down | Only the wrists move | Full range
m: Lifting the forearms off the legs > Keep them flat on your thighs | Bouncing the weight > Slow down and pause at the top | Going too heavy > Use light weights and high reps
n: Light dumbbells. Forearms on the thighs, wrists over the knees.
f: Fifteen to twenty-five light reps. Forearms respond to volume.

#farmer a:carry
p: Walking with heavy weights at your sides. Grip, traps and a strong trunk.
s: Heavy dumbbells or kettlebells at your sides | Stand tall, shoulders back and down | Brace your stomach
e: Pick them up with a flat back, like a deadlift | Walk with short, steady steps | Stay tall; don't lean | Set them down with a flat back
c: Tall and proud | Short steps | Crush the handles
m: Leaning or slumping forward > Stand tall; use lighter weights | Long, bouncing strides > Take short, quick steps | Picking up with a rounded back > Hinge down and stand up, as in a deadlift
n: Start around a quarter of your bodyweight in each hand.
f: Walk 20–30 metres and put them down before your grip slips.
`;

export const TEXT_CORE = `
#plank a:hold
p: Holding a straight body on your forearms. It teaches the trunk to stay still under load.
s: Forearms on the floor, elbows under your shoulders | Legs straight back, toes tucked | Feet hip width
e: Lift your hips until your body is one straight line | Squeeze your glutes and thighs | Brace your stomach as if about to be poked | Breathe in short breaths | Hold, then lower your knees to finish
c: One straight line | Squeeze the glutes | Push the floor away
m: Hips sagging towards the floor > Squeeze your glutes and tuck your tailbone slightly | Hips piked high > Lower them in line with your shoulders | Holding your breath > Keep short breaths going
n: Elbows under the shoulders. Hold 20–45 seconds.
f: Three good 20-second holds beat one sagging minute.

#side-plank a:hold
p: Holding your body up on one forearm, side-on. It trains the side of the trunk and the hips.
s: Lie on your side, elbow under your shoulder | Legs straight and stacked | Top hand on your hip or reaching up
e: Lift your hips until your body is straight from head to feet | Push the floor away with your forearm | Hold | Lower, then switch sides
c: Hips high | Straight from head to heels | Push the floor away
m: Hips sagging towards the floor > Lift them until your body is straight | Rolling forwards or backwards > Stack your hips and shoulders | Shoulder shrugging to the ear > Push the floor away
n: Elbow under the shoulder. Hold 15–40 seconds each side.
f: Bend your knees and rest on them to make it easier.

#knee-raise a:coremove
p: Hanging from a bar and lifting your knees. Trains the lower stomach and grip.
s: Hang from a bar, hands shoulder width | Shoulders pulled down slightly | Legs still
e: Curl your knees up towards your chest | Tilt your pelvis up at the top | Lower slowly | Stop any swing before the next rep
c: Knees to chest | Curl the hips up | No swinging
m: Swinging to get the knees up > Pause at the bottom and slow down | Only lifting to hip height > Curl the hips up, not just the knees | Hanging from loose shoulders > Keep a slight pull down
n: Bar high enough that your feet clear the floor. Use straps if your grip gives out first.
f: Start with a few slow reps. A captain's chair works if hanging is too hard.

#leg-raise a:coremove
p: Hanging from a bar and lifting straight legs. Harder than the knee raise.
s: Hang from a bar, hands shoulder width | Pull your shoulders down slightly | Legs straight, feet together
e: Lift your straight legs to hip height or higher | Pause | Lower slowly | Stop the swing
c: Legs long | Lift with control | No swing
m: Swinging the legs up > Pause at the bottom and slow down | Bending the knees halfway > Keep them straight or switch to knee raises | Arching the back at the bottom > Keep the stomach tight
n: Bar high enough for straight legs to hang.
f: Master slow knee raises first.

#cable-crunch a:coremove
p: Kneeling and crunching down against a cable. The stomach muscles work against real weight.
s: Kneel facing a high pulley with a rope | Hold the rope beside your head | Hips high, not sitting back
e: Curl your ribs down towards your hips | Round your back as you go | Squeeze your stomach | Uncurl slowly | Keep your hips still
c: Ribs to hips | Round the spine | Hips stay still
m: Sitting back and pulling with the hips > Keep your hips high and still | Pulling with the arms > Hold the rope still at your head | Going too heavy > Use a weight you can curl slowly
n: High pulley, rope attachment. Kneel a step back from the stack.
f: Think "curl", not "bow". The movement is small.

#ab-wheel a:coremove
p: Rolling a wheel out and back from your knees. A very hard trunk exercise.
s: Kneel on a pad | Hold the wheel under your shoulders | Tuck your tailbone and brace
e: Roll the wheel forward slowly | Let your hips move forward with you | Go only as far as you can keep your back flat | Pull the wheel back in with your stomach
c: Tuck the tail | Roll slow | Pull back with the stomach
m: Lower back sagging as you roll out > Go less far and brace harder | Hips staying high and back, arms only > Let the hips travel forward | Rolling out fast > Take three seconds to roll out
n: Start rolling towards a wall so it stops you early.
f: Roll out only a short way for the first few sessions.
x: Skip it during low back pain.

#deadbug a:coremove
p: On your back, reaching an arm and the opposite leg away. It teaches the stomach to keep the lower back still.
s: Lie on your back | Arms straight up to the ceiling | Knees bent at 90° over your hips | Press your lower back gently into the floor
e: Reach one arm back overhead and the opposite leg out long | Keep your lower back on the floor | Breathe out as you reach | Return and switch sides
c: Back glued down | Reach long, move slow | Breathe out as you reach
m: Lower back lifting off the floor > Reach less far | Rushing the reaches > Take three seconds each way | Holding your breath > Breathe out as you reach
n: Arms over the shoulders, knees over the hips.
f: Just move the legs to start, keeping the arms up.

#pallof a:hold
p: Pressing a cable out in front while it pulls you sideways. Trains the trunk to resist twisting.
s: Stand side-on to a pulley set at chest height | Hold the handle at your chest with both hands | Step away until you feel the pull | Feet hip width, knees soft
e: Brace | Press the handle straight out in front | Hold for two seconds without turning | Bring it back to your chest | Finish, then turn and do the other side
c: Don't let it turn you | Press straight out | Hips square
m: Letting the body rotate towards the stack > Step closer or lighten it | Leaning away from the cable > Stand upright over your feet | Pressing up instead of out > Press straight forward
n: Pulley at chest height. Stand about a metre from the stack.
f: The effort is in not moving. Start light.

#russian a:coremove
p: Sitting leaned back and turning side to side. The obliques work to rotate and control.
s: Sit on the floor, knees bent | Lean back until you feel your stomach work | Hands together in front of you, or holding a light weight
e: Rotate your chest and hands to one side | Pause | Rotate to the other side | Keep the lean steady
c: Turn from the ribs | Chest tall | Slow and controlled
m: Only moving the arms > Turn the whole chest | Rounding the back > Sit taller and lean back less | Swinging fast from side to side > Pause for a moment at each side
n: Feet on the floor to start, lifted to make it harder.
f: Keep your feet down until you can do 20 controlled turns.

#hip-airplane a:balance
p: On one leg, hinging forward and turning the hips open and closed. Balance and hip control.
s: Stand on one leg, knee soft | Hold a support with one hand if you need to | Hands on hips
e: Hinge forward until your body is level | Keep the standing knee soft | Turn your hips open towards the ceiling | Turn them back down | Stand up and repeat
c: Hinge, then turn | Standing knee soft | Slow and steady
m: Standing knee locked > Keep it soft | Rounding the back to get lower > Hinge only as far as you can | Rushing the turn > Move slowly and pause at each end
n: Hold a rack or wall with one hand to start.
f: Five slow reps each side is plenty.

#sled-push a:cardio
p: Driving a loaded sled across the floor. Leg power and conditioning, with no lowering.
s: Hold the upright poles at chest height, arms bent | Lean forward about 45° | One foot forward
e: Drive through the balls of your feet | Take short, powerful steps | Keep your hips low and back flat | Push for the set distance
c: Low and long | Short, fast steps | Drive the floor back
m: Standing too upright > Lean into the sled | Long, slow steps > Short and quick | Rounding the back > Brace and look slightly ahead
n: Poles at chest height. Start with a light load.
f: Push 10–20 metres, then rest. It gets hard fast.

#kb-swing a:power
p: Snapping a kettlebell forward with a hip hinge. Power, glutes and conditioning.
s: Bell on the floor about one step in front of you | Feet a little wider than shoulder width | Hinge and grip the handle with both hands
e: Hike the bell back between your legs | Snap your hips forward to stand tall | Let the bell float up to chest height | Let it swing back and hinge to meet it | Keep your arms relaxed
c: Hike, snap, float | Hips, not arms | Stand tall at the top
m: Squatting it instead of hinging > Push your hips back; shins stay near vertical | Lifting with the arms > Let the hips throw it | Leaning back at the top > Stand straight, squeeze glutes
n: Start with 8–12 kg. Bell reaches chest height, no higher.
f: Practise the hip hinge first: push your hips back to touch a wall.

#clean a:power
p: Pulling a bar from the floor to your shoulders in one fast move. Power for the whole body.
s: Set up as for a deadlift | Grip just outside your legs | Shoulders slightly in front of the bar
e: Push the floor away and lift the bar past your knees | Jump up hard, extending hips and knees | Shrug and pull yourself under the bar | Catch it on your shoulders with elbows high, in a quarter squat | Stand up
c: Push, jump, catch | Bar stays close | Fast elbows
m: Pulling with the arms early > Keep them long until the jump | Bar swinging away from the body > Keep it brushing your legs | Catching with low elbows > Whip the elbows up fast
n: Grip just outside the legs. Catch in a quarter squat.
f: Learn it from a coach. Start with an empty bar or a broomstick.
x: A technical lift. Learn it light, clear the area, and stop when your speed drops.

#snatch a:power
p: Lifting a bar from the floor to overhead in one move. The fastest lift there is.
s: Wide grip, so the bar sits at your hip crease when standing | Feet hip width | Hips a little lower than a deadlift
e: Push the floor away | Jump as the bar reaches your hips | Pull yourself under the bar | Punch it overhead and catch in a squat | Stand up
c: Long arms, big jump | Punch up | Stable overhead
m: Swinging the bar away from the body > Keep it close | Catching with bent arms > Punch up to locked arms | Adding weight too soon > Master it with a PVC pipe first
n: Snatch grip: bar at the hip crease with straight arms.
f: Learn only with a coach.
x: Needs good shoulder mobility. Learn it with a coach and a light bar.

#thruster a:power
p: A front squat straight into an overhead press. Legs, shoulders and lungs.
s: Bar in the front rack | Feet shoulder width | Elbows high
e: Front squat down | Drive up hard | Use that drive to push the bar overhead | Lock out | Bring the bar back to your shoulders as you squat again
c: Squat, drive, press | One smooth move | Lock out overhead
m: Pausing at the top of the squat > Let the legs drive the bar up | Elbows dropping in the squat > Keep them high | Leaning back at lockout > Finish with the bar over your mid-foot
n: Front rack grip just outside the shoulders.
f: Use light weight; it is for conditioning.

#burpee a:cardio
p: Down to the floor and up into a jump. A full-body conditioning move with no kit.
s: Stand with feet hip width | Clear space around you | Arms relaxed at your sides
e: Squat down and put your hands on the floor | Jump your feet back into a plank | Do a push-up, or skip it | Jump your feet back to your hands | Jump up with arms overhead
c: Hands down, feet back | Chest down, feet in | Jump
m: Sagging hips in the plank > Brace your stomach and squeeze your glutes | Landing hard from the jump > Land softly on the balls of your feet | Losing form when tired > Slow down, or step instead of jumping
n: Five to ten reps at a steady pace.
f: Step the feet back and forward instead of jumping at first.

#mountain-climber a:cardio
p: Driving your knees in fast from a plank. A cardio move that also trains the trunk.
s: Push-up position, hands under shoulders | Body straight | Weight over your hands
e: Drive one knee towards your chest | Switch legs quickly | Keep your hips level | Keep a steady rhythm
c: Hips level | Quick feet | Shoulders over hands
m: Hips bouncing high > Keep them in line | Hands creeping forward > Keep shoulders over the hands | Short, tapping steps > Bring the knee in close
n: 20–40 seconds on, then rest.
f: Go slow at first; speed comes later.

#rowing a:cardio
p: The rowing machine. Legs, back and arms together; kind to the joints.
s: Strap your feet in, strap across the widest part of the foot | Hold the handle with straight arms | Sit tall
e: Push with your legs | Lean back slightly | Pull the handle to your lower ribs | Return: arms, then body, then knees | Find a rhythm
c: Legs, body, arms | Arms, body, legs | Push, don't pull
m: Pulling with the arms first > Push with the legs first | Rounding the back at the catch > Sit tall and reach from the hips | Knees bending before the hands pass them > Let the hands pass the knees first
n: Damper at 3–5. Strokes 18–24 a minute for steady rows.
f: Row easy for five minutes and focus only on the order.

#assault-bike a:cardio
p: A fan bike that uses arms and legs. The harder you go, the harder it pushes back.
s: Set the seat so your knee is slightly bent at the bottom | Hands on the handles | Sit tall
e: Push and pull the handles as you pedal | Keep the rhythm | Start easy | Finish each interval at a steady pace
c: Push and pull | Stay tall | Even rhythm
m: Starting too hard > Build over 5–10 seconds | Seat set too low > Raise it until your leg is almost straight | Only using the legs > Push and pull with your arms too
n: Seat height: leg almost straight at the bottom.
f: Ten seconds hard, fifty easy, five rounds.

#jump-rope a:cardio
p: Skipping with a rope. Light, springy calves and coordination.
s: Hold the handles at hip height | Elbows close to your body | Rope behind your heels
e: Swing the rope with your wrists | Jump just high enough to clear it | Land softly on the balls of your feet | Keep a steady rhythm
c: Wrists, not arms | Small jumps | Soft landings
m: Jumping too high > Just clear the rope | Swinging with the whole arm > Turn from the wrists | Landing flat-footed and heavy > Stay on the balls of your feet
n: Rope length: stand on the middle, handles reach your armpits.
f: Thirty seconds on, thirty off. Mistakes are normal at first.

#box-jump a:plyo
p: Jumping up onto a box. Power for the legs.
s: Stand a small step from a sturdy box | Feet hip width | Arms ready to swing
e: Swing your arms back and dip | Jump up, swinging the arms forward | Land softly on the box, knees bent | Stand up tall | Step down, don't jump down
c: Load, jump, land soft | Land quietly | Step down
m: Landing in a deep squat > Pick a lower box | Jumping back down > Always step down from the box | Box too high > Height is not the point; pick one you land on softly
n: Start at a 30–50 cm box.
f: Start low. Make every landing silent.

#sprint a:cardio
p: Short, all-out runs. Top-end speed and the hamstrings.
s: Warm up well | Mark out 20–60 metres | Stand in a split stance
e: Drive hard off the front leg | Pump your arms | Stay tall after the first few steps | Slow down gradually after the line | Walk back to rest fully
c: Push the ground back | Drive the knees | Arms fast
m: Sprinting with cold muscles > Warm up with easy jogs and drills first | Resting too little between runs > Rest two to three minutes | Reaching out with long strides > Let each foot land under your body
n: 20–60 metres. Full rest between reps.
f: Start at about 80% effort.
x: Warm up for at least 10 minutes. Stop at any sharp tug in the hamstring.

#incline-walk a:cardio
p: Walking on a steep treadmill. Hard work for the legs and heart, easy on the joints.
s: Set the incline between 8% and 15% | Speed you can walk at comfortably | Hands off the rails
e: Walk tall | Lean forward slightly from the ankles | Keep your hands free | Keep a steady pace
c: Tall and forward | No hands | Steady breath
m: Holding the rails > Let go; lower the incline if needed | Leaning back against the slope > Lean slightly forward from the ankles | Walking too fast > Keep it a walk, not a jog
n: Incline 8–15%, speed 4.5–6 km/h.
f: Start at 8% for 10 minutes.

#bench-dip a:press
p: Dipping with your hands on a bench behind you. Triceps with bodyweight.
s: Sit on the edge of a bench, hands beside your hips | Slide your bottom off the bench | Legs out, heels on the floor
e: Bend your elbows to lower your hips | Keep your back close to the bench | Stop when your upper arms are level with the floor | Push back up
c: Back close to the bench | Elbows back | Shoulders down
m: Going too deep > Stop at upper arms level | Shoulders rolling forward > Keep the chest up | Elbows flaring out > Point them back
n: Bend the knees to make it easier.
f: Start with bent knees and a small range.
x: Skip it if the front of the shoulder hurts.

#pike-pushup a:press
p: A push-up with your hips high. A bodyweight shoulder press.
s: Start in a push-up position | Walk your feet in and lift your hips high | Head between your arms
e: Bend your elbows to lower your head towards the floor | Keep your hips high | Stop just above the floor | Press back up
c: Hips high | Head towards the floor | Press up
m: Hips dropping into a push-up > Keep them high | Elbows flaring wide > Keep them angled back | Hitting the head > Control the lowering
n: Hands shoulder width. Feet on a box to make it harder.
f: Short range at first.

#inverted-row a:pull
p: Pulling your chest to a bar at hip height. A bodyweight row.
s: Set a bar at hip height | Lie under it and grip slightly wider than your shoulders | Body straight, heels on the floor
e: Pull your chest to the bar | Squeeze your shoulder blades | Lower slowly | Keep your body straight
c: Chest to the bar | Squeeze | One straight line
m: Hips sagging towards the floor > Squeeze your glutes | Stopping short of the bar > Pull until your chest touches | Head poking forward > Keep your neck in line with your body
n: Higher bar is easier; lower is harder.
f: Start with a high bar and bent knees.

#hip-hinge a:hinge
p: A hinge on one leg with a dumbbell. Hamstrings, glutes and balance.
s: Stand on one leg, knee soft | Dumbbell in the opposite hand | Other foot just behind you
e: Hinge forward, lifting your back leg behind you | Keep your hips level | Lower the dumbbell towards the floor | Stand up by driving your hips forward
c: One line from head to heel | Hips level | Soft standing knee
m: Opening the hips to the side > Keep both hips facing the floor | Rounding the back to go lower > Stop higher and keep a long spine | Locking the standing knee > Keep it soft
n: Light dumbbell. Hold a support with the free hand to start.
f: Use no weight until you can hinge without wobbling.

#copenhagen a:hold
p: A side plank with the top leg on a bench. It builds the inner thighs and helps prevent groin strains.
s: Lie on your side next to a bench | Top leg on the bench, inner knee or ankle on the pad | Forearm on the floor under your shoulder
e: Lift your hips until your body is straight | Bottom leg can rest or lift | Hold | Lower and switch
c: Hips up | Squeeze the top leg down | Straight body
m: Hips sagging towards the floor > Use shorter holds and keep the body straight | Rolling back onto your bottom > Stack one hip over the other | Strain inside the knee > Put the bench under the knee instead of the ankle
n: Bench under the knee is easier; under the ankle is harder.
f: Start with 10-second holds with the knee on the bench.

#calf-hop a:plyo
p: Small, quick hops on stiff ankles. Springy calves and tendons.
s: Stand tall, feet hip width | Weight on the balls of your feet | Arms relaxed
e: Hop up and down quickly | Keep your knees almost straight | Spend as little time on the floor as you can | Land quietly
c: Stiff ankles | Quick contacts | Quiet landings
m: Bending the knees a lot > Keep them almost straight | Landing on the heels > Stay on the balls of your feet | Staying on the floor too long > Bounce straight back up
n: 10–20 hops per set.
f: Two short sets before a run is plenty.

#landmine-press a:press
p: Pressing one end of an angled bar up and forward. Shoulder-friendly pressing that also trains the trunk.
s: Wedge one end of a barbell into a landmine holder or a corner | Stand facing the free end in a staggered stance | Hold the end of the bar at your shoulder with one or both hands | Brace and squeeze the glute of the back leg
e: Breathe in and brace | Press the bar up and forward along its arc | Let your shoulder blade reach forward at the top | Pause with the arm long | Lower slowly back to the front of your shoulder
c: Up and out | Reach at the top | Ribs down
m: Leaning back to press > Squeeze the glutes and keep the ribs down | Twisting the hips as you press > Keep both hips facing the bar | Stopping short of a long arm > Finish each rep with a full reach
n: Staggered stance, back foot on the pressing side. Hold the bar end at shoulder height.
f: A good choice if pressing straight overhead bothers your shoulders.

#landmine-row a:pull
p: Rowing one end of an angled bar while straddling it. Heavy rowing that is kind to the lower back.
s: Straddle the bar near the loaded end, facing away from the fixed end | Hinge until your torso is at about 45° | Hold the bar just under the plates with both hands, or use a V-handle | Knees soft, back flat
e: Brace | Row the bar end up towards your chest | Drive your elbows back past your body | Squeeze your shoulder blades | Lower slowly to straight arms | Keep your torso still
c: Chest proud | Elbows back | Squeeze and hold
m: Standing up more with each rep > Keep the same torso angle | Rounding the back to reach > Brace and hinge from the hips | Jerking the weight with the hips > Pause at the top of each rep
n: Torso about 45°. A V-handle under the bar sleeve gives a neutral grip.
f: Start with small plates. Larger plates shorten the range.

#zercher a:squat
p: A squat holding the bar in the crook of your elbows. It builds an upright torso and a strong upper back.
s: Set the bar in the rack at about belly height | Wrap it in a pad | Hook the bar in the crooks of your elbows, hands clasped in front | Stand up and take two steps back
e: Breathe in and brace | Squat down between your heels, staying tall | Keep your elbows up and the bar close | Go as deep as you can with a flat back | Drive up through the whole foot
c: Stay tall | Elbows up | Squeeze the bar in
m: Rounding the upper back as the bar pulls forward > Lighten it and keep the elbows high | Knees caving in > Push them out over the toes | Letting the bar slide down the arms > Keep the elbows bent and hug the bar in
n: Feet shoulder width. Bar wrapped in a pad or towel.
f: The elbows need a few sessions to get used to the bar. Start light.

#belt-squat a:squat
p: A squat with the weight hanging from a belt at your hips. Heavy leg work with no load on the spine.
s: Stand on the two platforms, one foot on each | Fasten the belt around your hips | Clip the weight to the belt | Hold the handles in front of you lightly
e: Breathe in and brace | Squat down between your feet | Keep your chest up and your knees over your toes | Go down until your thighs are at least level | Drive up through your whole foot
c: Sit between the feet | Chest up | Push the floor apart
m: Leaning forward over the handles > Stay tall and hold the handles lightly | Knees caving in > Push them out | Stopping high in the squat > Squat until the thighs are level or lower
n: Feet shoulder width on the platforms. Belt low on the hips.
f: A good choice when your back is tired but your legs still need work.

#chest-fly-db a:raise
p: A wide dumbbell arc lying on a bench. It gives the chest a long stretch.
s: Lie on a flat bench | Hold the dumbbells over your chest, palms facing each other | Unlock the elbows into a slight bend | Feet flat, shoulder blades pinned
e: Open your arms out in a wide arc | Keep the same bend in your elbows | Lower until you feel a stretch across your chest | Bring the dumbbells back together along the same arc | Squeeze at the top
c: Hug a barrel | Elbows stay soft | Stretch, then squeeze
m: Lowering too far, so the shoulders strain > Stop at a comfortable stretch | Bending the elbows more, turning it into a press > Keep one fixed bend | Using heavy dumbbells > Use about half of what you press
n: Flat bench. Light dumbbells.
f: Think of the movement as a big hug. Keep it light.

#reverse-curl a:arm
p: A curl with palms facing down. It trains the forearms and the biceps.
s: Stand tall holding a bar at your thighs | Grip shoulder width, palms facing down | Elbows at your sides | Wrists straight
e: Curl the bar up towards your shoulders | Keep your wrists in line with your forearms | Pause near the top | Lower slowly to straight arms
c: Knuckles to the ceiling | Wrists straight | Slow down
m: Swinging the bar up > Use a lighter bar and stand still | Wrists bending back > Keep them straight | Elbows drifting forward > Pin them to your sides
n: Grip shoulder width. An EZ bar is easier on the wrists.
f: Expect to use about half your normal curl weight.

#neck-curl a:hold
p: Nodding your head up while lying on a bench. It builds neck strength slowly and safely.
s: Lie on your back on a bench with your head just off the end | Rest your hands on your chest | Relax your shoulders
e: Let your head go back slowly until it is level with the bench | Tuck your chin | Nod your chin towards your chest | Pause | Lower slowly back to level
c: Tuck, then nod | Slow and small | Shoulders stay down
m: Moving fast or jerking > Take three seconds each way | Adding weight too soon > Use only the weight of your head for several weeks | Dropping the head far back > Stop when the head is level with the bench
n: No added weight to start. A folded towel on the forehead adds a little later.
f: Five slow reps is enough the first time.
x: Stop at any pain, pins and needles, or dizziness.

#tib-raise a:calf
p: Lifting your toes while leaning on a wall. It trains the shins and helps runners with shin soreness.
s: Stand with your back and bottom against a wall | Walk your feet about a step forward | Legs straight, heels on the floor
e: Lift your toes and the front of your feet as high as they go | Pause at the top | Lower slowly until the toes just touch | Repeat without resting
c: Toes to the shins | Pause at the top | Slow down
m: Bending the knees to help > Keep the legs straight | Rushing the reps > Slow down and pause | Feet too close to the wall > Step further out to make it harder
n: Feet about 30 cm from the wall. Further out is harder.
f: Do 15–25 reps. The shins will burn quickly.

#calf-jump a:plyo
p: Bouncing on almost straight legs. It builds springy calves and ankles.
s: Stand tall with your feet hip width | Weight on the balls of your feet | Arms relaxed at your sides
e: Bounce up and down quickly | Keep your knees almost straight | Let your ankles do the work | Land quietly | Stop the set when the bounce slows
c: Stiff ankles | Quick off the floor | Land quietly
m: Bending the knees a lot to jump higher > Keep them almost straight | Landing on your heels > Stay on the balls of your feet | Staying on the floor too long > Bounce straight back up
n: 10–20 bounces per set.
f: Start with two short sets. The calves will feel it the next day.

#front-plank-reach a:hold
p: A plank where one arm reaches forward. It trains the trunk to stay square while support shifts.
s: Start in a push-up position | Hands under your shoulders | Feet wider than your hips | Body in one straight line
e: Brace your stomach and glutes | Reach one arm forward to shoulder height | Hold for two seconds without the hips moving | Put the hand back down | Switch arms
c: Hips stay still | Reach long | Brace before you reach
m: Hips twisting as the arm lifts > Widen your feet and brace harder | Hips sagging towards the floor > Squeeze your glutes | Rushing from side to side > Pause for two seconds on each reach
n: Feet wider than the hips. Wider is easier.
f: Start from your knees if the full plank wobbles.

#suitcase-carry a:carry
p: Walking with a weight in one hand. It trains the side of the trunk to keep you upright.
s: Hold one heavy dumbbell or kettlebell at your side | Stand tall, shoulders level | Brace your stomach
e: Walk with short, steady steps | Keep your shoulders level and your body upright | Walk the set distance | Put the weight down with a flat back | Switch hands and walk back
c: Stand tall | Don't lean | Shoulders level
m: Leaning away from the weight > Stand tall; use a lighter weight | Hiking the loaded shoulder up > Keep both shoulders level | Rushing the walk > Take short, steady steps
n: Start with about a quarter of your bodyweight.
f: Walk 20 metres with each hand.

#hollow-hold a:hold
p: Holding a banana shape on your back. Basic trunk strength for gymnastics and lifting.
s: Lie on your back | Arms overhead, legs straight | Press your lower back into the floor
e: Brace your stomach | Lift your shoulders, arms and legs a little off the floor | Keep your lower back pressed down | Hold while breathing in short breaths | Lower slowly to finish
c: Lower back glued down | Long body | Keep breathing
m: Lower back lifting off the floor > Bend your knees or raise your legs higher until it stays down | Holding your breath > Keep short breaths going | Straining the neck > Look at your toes and keep the chin tucked
n: Bend the knees and keep the arms by your sides to make it easier.
f: Hold 15 seconds at a time. Make it harder only when the back stays down.

#bird-dog a:coremove
p: Reaching one arm and the opposite leg out on all fours. It trains balance and a still trunk.
s: Kneel on all fours | Hands under your shoulders, knees under your hips | Back flat, neck long
e: Brace your stomach | Reach one arm forward and the opposite leg back | Stop when both are level with your body | Hold for two seconds | Bring them back in slowly | Switch sides
c: Long and level | Hips stay square | Slow in, slow out
m: Hips twisting as the leg lifts > Lift the leg only as high as your hips stay level | Arching the lower back > Keep the leg level, not higher | Rushing the reps > Pause for two seconds at the end
n: Hold each rep for two seconds. A light ball on the lower back shows any twist.
f: Five slow reps on each side is enough to start.

#wall-sit a:hold
p: Sitting against a wall with no chair. It builds endurance in the thighs.
s: Stand with your back flat against a wall | Walk your feet about two steps forward | Feet hip width apart
e: Slide down the wall | Stop when your thighs are level with the floor | Knees over your ankles | Hold, breathing steadily | Slide back up to finish
c: Thighs level | Back flat on the wall | Keep breathing
m: Sitting too high to make it easier > Slide down until the thighs are level | Knees falling inwards > Push them out over the toes | Pushing on the thighs with your hands > Cross your arms instead
n: Knees at 90°. Feet hip width.
f: Hold 30 seconds, rest, and repeat three times.

#glute-ham a:hinge
p: Lowering forward and pulling back up on a glute-ham machine. It builds strong hamstrings through their full job.
s: Set the pad so your knees sit just behind it | Lock your feet against the plate, ankles under the rollers | Start upright on your knees, body straight | Cross your arms on your chest
e: Lower your body forward slowly, staying straight from knees to head | Stop when your body is level with the floor | Pull yourself back up with your hamstrings | Squeeze your glutes to finish upright
c: One straight line | Pull with the backs of the legs | Slow on the way down
m: Bending at the hips to cheat > Keep the hips pushed forward in line | Dropping forward fast > Take three seconds to lower | Pad in the wrong spot > Set it so the kneecaps are just behind the pad
n: Knees just behind the pad. Feet firmly against the plate.
f: Push off the floor with your hands for the first reps.

#chest-supported-fly a:raise
p: A machine fly facing the pad. It trains the back of the shoulders with no balance needed.
s: Sit facing the pad with your chest against it | Set the seat so the handles are at shoulder height | Hold the handles with arms straight in front
e: Open your arms out wide in an arc | Keep a slight bend in the elbows | Pause when your arms are in line with your shoulders | Return slowly to the front
c: Open wide | Pause at the back | Slow return
m: Shrugging the shoulders up > Keep them down away from the ears | Bending the elbows to pull it like a row > Keep one fixed bend | Using too much weight > Go light and pause each rep
n: Handles at shoulder height. Chest flat on the pad.
f: Light and slow; this muscle is small.
`;

export const TEXT_KIT = `
#cable-crossover a:raise
p: Sweeping two cables from low to high in front of you. It targets the upper chest with steady tension.
s: Set both pulleys at the bottom | Hold a handle in each hand | Step forward into a split stance | Arms down and slightly out, elbows soft
e: Sweep your hands up and in | Bring them together in front of your upper chest | Squeeze for a second | Lower slowly back along the same arc
c: Scoop up and in | Elbows stay soft | Squeeze at the top
m: Shrugging the shoulders as the hands rise > Keep them down and back | Bending the elbows into a press > Hold one fixed bend | Leaning back to lift > Stay upright in the split stance
n: Pulleys at the lowest setting. Split stance, a step in front of the stacks.
f: Start with the lightest plates. It is about feel.

#single-cable-row a:pull
p: Rowing one cable handle to your hip while standing. Each side of the back on its own, with a little rotation.
s: Set a pulley at chest height with a single handle | Stand facing it in a split stance | Hold the handle with the arm reaching forward
e: Brace | Pull the handle to your hip | Drive the elbow back close to your side | Squeeze your shoulder blade back | Reach forward slowly, letting the shoulder travel | Finish one side, then switch
c: Elbow to the hip | Stay tall | Reach, then pull
m: Twisting the whole body to pull > Keep hips square, let only the shoulder move | Pulling to the chest > Pull to the hip | Cutting the reach short > Let the arm reach fully forward each rep
n: Pulley at chest height. Split stance, same-side foot back.
f: Keep it light and feel the back work.

#cable-pullover a:pull
p: Pulling a rope from overhead down to your thighs with long arms. It trains the lats through a long range.
s: Set a pulley high with a rope | Step back and hinge forward a little | Arms straight, reaching up towards the pulley
e: Keep your arms long | Pull the rope down in an arc to your thighs | Squeeze your lats at the bottom | Let the rope rise slowly until your arms are overhead again
c: Long arms | Sweep down | Feel the stretch at the top
m: Bending the elbows to push it down > Hold a fixed slight bend | Rocking the body > Keep the hinge steady | Letting the rope yank up > Control the return
n: High pulley. Rope or straight bar.
f: A light weight is enough. Aim for 12–15 smooth reps.

#overhead-cable-ext a:arm
p: Straightening your arms overhead against a cable behind you. The triceps work hard under a stretch.
s: Set a pulley at about chest height with a rope | Face away from the stack, rope behind your head | Step forward into a split stance | Lean forward slightly, elbows pointing forward
e: Keep your upper arms still beside your head | Straighten your arms forward and up | Squeeze your triceps | Let your hands return slowly behind your head
c: Elbows point forward | Straighten fully | Slow back
m: Elbows flaring wide > Keep them close to your head | Moving the upper arms > Only the forearms move | Arching the back > Brace and lean a little forward
n: Pulley at chest height. Rope attachment.
f: Start light. Get into position before you take the weight.

#cable-hip-abduction a:glute
p: Sweeping one leg out to the side against a cable. It trains the outer glutes that steady the hips.
s: Put an ankle cuff on the leg furthest from the stack | Clip it to a low pulley | Stand side-on, holding the frame | Stand tall on the inside leg
e: Sweep the outside leg out to the side | Keep your toes pointing forward | Pause at the top | Return slowly across the front of the standing foot
c: Toes forward | Stay tall | Slow return
m: Leaning the body to lift higher > Stand tall; the range is small | Turning the toes up > Keep them facing forward | Swinging the leg > Pause for a second at the top
n: Low pulley. Ankle cuff on the outside leg.
f: The movement is small; 12–20 reps each side.

#cable-woodchop a:coremove
p: Pulling a cable from high to low across your body. The trunk rotates with control.
s: Set a pulley high | Stand side-on, feet wider than your shoulders | Hold the handle with both hands, arms long, reaching up to the pulley
e: Brace | Pull the handle down and across your body towards the opposite knee | Turn through your chest and hips together | Keep your arms long | Return slowly
c: Turn the chest | Arms long | Slow return
m: Pulling with the arms > Keep them long and rotate the body | Only turning the arms, hips locked > Let the back heel pivot | Jerking the weight > Move smoothly both ways
n: High pulley. Stance wider than the shoulders.
f: Do both sides. Start light.

#cable-y-raise a:raise
p: Raising your arms into a Y with low cables. It trains the lower traps and back of the shoulders.
s: Set both pulleys at the bottom | Cross the cables: left hand holds the right cable, right hand holds the left | Stand in the middle, arms low in front
e: Raise your arms up and out into a Y shape | Keep your thumbs up | Stop around ear height | Lower slowly
c: Thumbs up | Make a Y | Shoulders down
m: Shrugging up to the ears > Keep the shoulders down | Leaning back to lift > Stand tall over your feet | Using too much weight > The lightest plate is often enough
n: Low pulleys, cables crossed. Very light weight.
f: Use the lightest setting and slow reps.

#kb-goblet a:squat
p: A goblet squat holding a kettlebell by the horns. Easy to learn and great for hip mobility.
s: Hold the kettlebell by the horns at your chest | Feet a little wider than your hips | Toes turned out slightly
e: Breathe in and brace | Sit down between your heels | Keep your chest tall behind the bell | Let your elbows brush the insides of your knees | Stand up
c: Chest tall | Elbows inside the knees | Push the floor away
m: Heels lifting off the floor > Sit back a little and widen your stance | Bell drifting away from the chest > Keep it pinned | Knees caving in > Push them out with your elbows
n: Feet a little wider than hips, toes out 15–30°.
f: Hold the bottom for a few seconds to open your hips.

#kb-press a:press
p: Pressing a kettlebell overhead from the rack. One arm at a time, with a strong trunk.
s: Clean the bell to the rack: handle in your palm, bell resting on the back of your forearm | Elbow tucked to your ribs | Feet hip width, glutes squeezed
e: Brace | Press the bell straight up | Turn your palm forward as it rises | Lock out with your bicep by your ear | Lower back to the rack
c: Punch the ceiling | Bicep by the ear | Squeeze the other fist
m: Leaning away from the bell > Squeeze the glutes and brace | Wrist bending back > Keep the wrist straight, handle low in the palm | Pressing out in front > Press straight up
n: Start with 8–12 kg. Handle diagonal across the palm.
f: Learn the rack position first. The bell should rest, not bang.

#kb-row a:pull
p: Rowing a kettlebell with one hand on a bench. A back builder with an easy grip.
s: One hand and the same-side knee on a flat bench | Back flat | Kettlebell hanging from a straight arm
e: Pull the bell to your hip | Keep the elbow close | Squeeze at the top | Lower slowly
c: Elbow to the hip | Shoulders square | Pause at the top
m: Twisting the torso to lift > Keep shoulders square | Pulling to the shoulder > Pull to the hip | Dropping the bell > Lower in two seconds
n: Flat bench. Supporting hand under the shoulder.
f: The thick handle trains your grip as well.

#turkish-getup a:power
p: Standing up from the floor with a kettlebell held overhead. Shoulder stability, mobility and control.
s: Lie on your back, bell in one hand, arm straight up | Same-side knee bent, foot flat | Other arm and leg out at 45°
e: Push through the bent leg and roll onto your elbow | Push up onto your hand | Lift your hips | Sweep the straight leg under you to kneel | Stand up | Reverse every step to lie back down
c: Eyes on the bell | Arm locked | One step at a time
m: Taking your eyes off the bell > Watch it until you stand | Bending the working arm > Keep it locked | Rushing from step to step > Pause for a breath at each step
n: Start with no weight, or a shoe balanced on your fist.
f: Learn each step without a bell. One slow rep each side is a set.
x: Clear the space around you. Put the bell down if the arm bends.

#kb-clean a:power
p: Swinging a kettlebell into the rack position. It links the swing to the press.
s: Bell a step in front of you | Hinge and grip with one hand | Feet about shoulder width
e: Hike the bell back between your legs | Snap your hips forward | Keep the elbow close as the bell rises | Let the bell turn around your wrist into the rack | Stand tall | Drop it back into the next swing
c: Zip up the jacket | Elbow close | Soft landing
m: Bell crashing onto the forearm > Keep the elbow close and let the hand go around the bell | Swinging it out wide > Keep it close to your body | Lifting with the arm > Let the hips drive it
n: Start with a light bell, 8–12 kg.
f: Practise with a light bell until the landing is quiet.

#kb-snatch a:power
p: Swinging a kettlebell from between the legs to overhead in one move. Power and conditioning.
s: Bell a step in front of you | Hinge and grip with one hand | Feet about shoulder width
e: Hike the bell back | Snap your hips forward | Keep the bell close as it rises | Punch your hand through at the top | Lock out overhead | Let it drop back into the next swing
c: Hips throw it | Punch through | Lock out
m: Bell flipping over and banging the wrist > Punch through early | Pulling with the arm > Let the hips do the work | Leaning back at the top > Stand tall with the bell over your shoulder
n: Light bell. Five to ten reps each side.
f: Master the swing and the clean first.
x: Advanced. Stop if your wrist gets bruised.

#kb-deadlift a:hinge
p: Picking a kettlebell up from between your feet. The first hinge to learn.
s: Bell between your feet, handle in line with your ankles | Feet hip width | Hinge down and grip the handle with both hands
e: Brace | Push the floor away | Stand up tall, hips forward | Lower by pushing your hips back | Touch the bell down gently
c: Hips back | Chest proud | Stand tall
m: Rounding the back to reach the bell > Push the hips back further | Squatting it down > Keep your shins near vertical | Leaning back at the top > Stand tall and squeeze your glutes
n: Bell handle in line with your ankles.
f: Start here before barbell deadlifts.

#band-pull-apart a:raise
p: Pulling a band apart in front of your chest. Great for posture and the back of the shoulders.
s: Hold a light band with both hands, palms down | Arms straight in front at shoulder height | Hands shoulder width apart
e: Pull the band apart | Move your hands out to the sides | Squeeze your shoulder blades together | Return slowly
c: Arms long | Squeeze the shoulder blades | Slow return
m: Shrugging the shoulders up > Keep the shoulders down away from your ears | Bending the elbows > Keep them straight | Letting the band snap back > Return slowly under control
n: Light band. Hands shoulder width to start.
f: Do 15–20 reps during warm-ups.

#band-face-pull a:pull
p: A face pull with a band. Easy shoulder health work at home.
s: Anchor the band at head height | Hold each end with thumbs pointing back | Step back until the band is taut
e: Pull the band towards your face | Keep your elbows high | Pull your hands apart beside your ears | Squeeze | Return slowly
c: Elbows high | Pull apart | Show your biceps
m: Elbows dropping into a row > Keep them at shoulder height | Leaning back to pull > Stand tall and step closer | Stopping the pull short > Finish with the hands beside your ears
n: Anchor at head height.
f: A good warm-up before pressing.

#band-row a:pull
p: Rowing a band anchored in front of you. Back work anywhere.
s: Anchor the band at chest height | Hold the ends with arms straight | Stand tall, knees soft
e: Pull the band to your ribs | Drive your elbows back | Squeeze your shoulder blades | Return slowly
c: Elbows back | Squeeze | Slow return
m: Leaning back to pull > Stand tall; step closer | Shrugging the shoulders > Keep them down away from your ears | Rushing the reps > Pause for a second at the end
n: Anchor at chest height. Step back to add tension.
f: Great for 15–20 reps.

#band-curl a:arm
p: Curling a band while standing on it. Biceps anywhere; hardest at the top.
s: Stand on the middle of a band | Hold the ends, palms up | Elbows at your sides
e: Curl your hands up towards your shoulders | Keep your elbows by your ribs | Squeeze at the top | Lower slowly to straight arms
c: Elbows pinned | Squeeze | Slow down
m: Swinging the body to get the hands up > Stand still and use a lighter band | Elbows moving forward > Keep them pinned to your sides | Letting the band snap down > Lower slowly under control
n: Wider stance on the band adds tension.
f: 15–20 reps.

#band-pushdown a:arm
p: Pushing a band down with the elbows at your sides. Triceps anywhere.
s: Loop a band over a high bar or door anchor | Hold the ends | Elbows at your ribs
e: Push your hands down until your arms are straight | Keep your elbows by your ribs | Squeeze your triceps | Let your hands come back up slowly
c: Elbows pinned | Straighten fully | Slow back
m: Elbows drifting forward to help > Keep them at your sides | Leaning your body over the band > Stand tall and step back a little | Stopping before the arms are straight > Straighten fully each rep
n: Anchor above head height.
f: 15–25 reps.

#band-walk a:glute
p: Stepping sideways with a band around your legs. It wakes up the outer glutes.
s: Put a band just above your knees | Feet hip width | Bend your knees slightly, hips back
e: Step sideways with one foot | Follow with the other, keeping tension on the band | Keep your toes pointing forward | Take 10–15 steps, then go back the other way
c: Knees out | Stay low | Toes forward
m: Knees caving in > Push them out against the band | Standing up tall > Keep a slight squat | Dragging the feet together > Keep the band tight
n: Band above the knees, or at the ankles for more.
f: A good warm-up before squats.

#band-pallof a:hold
p: A Pallof press with a band. It trains the trunk to resist twisting.
s: Anchor the band at chest height beside you | Hold it at your chest with both hands | Step out until it pulls | Feet hip width, knees soft
e: Brace | Press your hands straight out | Hold for two seconds | Bring them back | Switch sides
c: Don't let it turn you | Press straight out | Hips square
m: Rotating towards the anchor > Step closer or use a lighter band | Leaning away from the band > Stand tall over your feet | Pressing up instead of out > Press straight forward
n: Band at chest height.
f: Start with 10 slow reps each side.

#smith-squat a:squat
p: A squat on a Smith machine. The bar runs on rails, so you can focus on the legs.
s: Set the bar at shoulder height | Step under it, bar on your upper back | Feet a little in front of the bar, shoulder width | Unhook by turning the bar
e: Brace | Sit down, keeping your back tall | Go until your thighs are level or lower | Drive up | Rehook at the end of the set
c: Feet slightly forward | Sit down | Push the floor away
m: Feet directly under the bar, so the knees jam forward > Step them a little forward | Heels lifting off the floor > Sit back more and move your feet forward | Forgetting the safety stops > Set them just below your bottom position
n: Feet 10–20 cm in front of the bar. Safety stops just below your lowest point.
f: Set the safety stops first, every time.

#smith-bench a:press
p: A bench press on a Smith machine. A fixed path, so you can press safely alone.
s: Put a flat bench under the bar | Lie so the bar lines up with your lower chest | Set the safety stops just above your chest | Grip about 1.5× shoulder width
e: Unhook by turning the bar | Lower to your lower chest | Press up | Rehook
c: Shoulder blades pinned | Touch the chest | Press up
m: Hips lifting off the bench > Keep your glutes down | Bench in the wrong place, bar hits the neck > Line the bar up with your lower chest | No safety stops > Set them first
n: Bar over the lower chest. Safeties just above chest height.
f: Good for training alone.

#smith-incline a:press
p: An incline press on a Smith machine. Upper chest with a steady path.
s: Set an incline bench at 30° under the bar | Line the bar up with your upper chest | Set the safety stops | Grip a little wider than your shoulders
e: Unhook | Lower to the upper chest | Press up | Rehook
c: Bar to the collarbone | Pin the shoulder blades | Press up
m: Bench set so the bar lands on the neck > Move the bench until the bar meets the upper chest | Bench too steep > Keep it at 30° | Elbows flared straight out > Tuck them to about 45°
n: Bench at 30°. Bar lands just below the collarbone.
f: Check the bar path with no plates first.

#smith-ohp a:press
p: A seated shoulder press on a Smith machine. Heavy overhead pressing with no balance needed.
s: Put an upright bench under the bar | Sit so the bar passes just in front of your face | Grip just outside your shoulders | Set the safety stops at chin height
e: Unhook | Lower the bar to your chin | Press up to straight arms | Rehook
c: Back on the pad | Press straight up | Lower to the chin
m: Arching away from the pad > Keep your back flat | Lowering behind the neck > Keep it in front | Bench too far forward > Line the bar up with your chin
n: Upright bench. Bar path just in front of the face.
f: Check the bar clears your nose before you add plates.

#smith-rdl a:hinge
p: A Romanian deadlift on a Smith machine. The bar path is fixed, so you can focus on the hinge.
s: Set the bar at mid-thigh height | Stand close, feet hip width | Grip just outside your thighs | Unhook
e: Push your hips back | Let the bar slide down your thighs | Stop at a strong hamstring stretch | Drive your hips forward to stand
c: Hips back | Bar on the legs | Long spine
m: Rounding the back > Stop at your stretch | Standing too far from the bar > Step in close | Bending the knees too much > Keep the angle fixed
n: Feet under the bar. Knees soft and fixed.
f: Set the safety stops at about knee height.

#smith-calf a:calf
p: A standing calf raise with the Smith bar on your back.
s: Put a step or plate under the bar | Bar on your upper back | Balls of your feet on the step, heels off
e: Lower your heels as far as you can | Pause | Rise up onto your toes | Pause at the top | Lower slowly
c: Full stretch | Full rise | Pause at both ends
m: Bouncing out of the bottom > Pause for a full second in the stretch | Bending the knees to push > Keep them still | Stopping halfway up or down > Use the full range, all the way up and down
n: Step or plate about 5 cm high.
f: Slow reps grow calves.

#trapbar-row a:pull
p: Rowing a trap bar with a neutral grip. A heavy row that is easy on the wrists.
s: Stand in the middle of the bar | Hinge and grip the handles | Back flat, torso about 45°
e: Row the bar towards your hips | Drive your elbows back | Squeeze | Lower slowly
c: Elbows back | Hold the hinge | Squeeze
m: Standing up more with each rep > Keep the same torso angle | Rounding the back > Brace and hinge from the hips | Jerking the bar up > Pause for a second at the top
n: Torso about 45°. Use the high handles.
f: Start light; the neutral grip feels strong.

#trapbar-carry a:carry
p: Walking with a loaded trap bar. Heavy carrying with good balance.
s: Stand in the middle of the bar | Deadlift it up | Stand tall, brace
e: Walk with short, steady steps | Stay tall | Walk the set distance | Set it down with a flat back
c: Tall | Short steps | Crush the handles
m: Leaning forward as you walk > Stand tall and brace | Long, bouncing strides > Take short, quick steps | Rounding the back to set it down > Hinge down as in a deadlift
n: Start with bodyweight or less.
f: 20–30 metres.

#trapbar-jump a:plyo
p: A jump holding a light trap bar. Loaded power for the legs.
s: Stand in the middle of the bar | Hold the handles | Feet hip width
e: Dip down quickly | Jump straight up | Land softly | Reset and repeat
c: Dip and jump | Land soft | Reset
m: Using too much weight > Keep it light so the jump stays fast | Landing with stiff legs > Bend your knees to soak up the landing | Bouncing straight into the next rep > Stand still and reset between jumps
n: About 20–30% of your deadlift.
f: Three to five jumps per set.

#ez-curl a:arm
p: A curl with an EZ bar. The angled grip is kinder to the wrists.
s: Hold the EZ bar on the angled grips, palms up | Stand tall | Elbows at your sides
e: Curl the bar up | Keep your elbows still | Squeeze | Lower slowly
c: Elbows pinned | Squeeze | Slow down
m: Swinging the body to lift > Stand still and use less weight | Elbows moving forward > Keep them pinned to your sides | Stopping short at the bottom > Lower all the way to straight arms
n: Grip on the inner or outer bends.
f: Start with the empty EZ bar.

#ez-skull a:arm
p: A skullcrusher with an EZ bar, lowered behind the head for a longer stretch.
s: Lie on a flat bench | Hold the EZ bar over your chest on the angled grips | Tilt your arms back slightly
e: Bend your elbows to lower the bar behind your head | Keep your elbows pointing up | Straighten your arms | Squeeze
c: Elbows up | Behind the head | Straighten fully
m: Elbows flaring out > Keep them in | Moving the upper arms > Keep them still | Going too heavy > Stay light and lower slowly
n: Angled grip. Upper arms tilted back.
f: Go light; the stretch is deep.

#ez-upright a:pull
p: An upright row with an EZ bar. Easier on the wrists than a straight bar.
s: Hold the EZ bar at your thighs | Grip about shoulder width | Stand tall
e: Pull the bar up, elbows leading | Keep the bar close to your body | Stop when your elbows reach shoulder height | Lower slowly to the thighs
c: Elbows lead | Bar close | Stop at shoulder height
m: Pulling the bar too high > Stop with the elbows at shoulder height | Swinging the body > Brace and use less weight | Grip too narrow > Use the outer bends of the bar
n: Wide grip on the outer bends.
f: Keep the range short to start.
x: Skip it if lifting your arms pinches your shoulder.

#ez-reverse-curl a:arm
p: A reverse curl with an EZ bar. Forearms and biceps with less wrist strain.
s: Hold the EZ bar palms down | Stand tall | Elbows at your sides
e: Curl the bar up towards your shoulders | Keep your wrists straight | Pause near the top | Lower slowly to straight arms
c: Knuckles up | Wrists straight | Slow
m: Swinging the bar up > Stand still and go lighter | Wrists bending back > Keep them in line with the forearms | Elbows drifting forward > Pin them to your sides
n: Grip on the outer bends.
f: Light weight, 12–15 reps.

#ez-pullover a:pull
p: Lowering an EZ bar behind your head while lying on a bench. It stretches the lats and the chest.
s: Lie on a flat bench | Hold the EZ bar over your chest, elbows slightly bent | Feet flat on the floor
e: Lower the bar in an arc behind your head | Keep the elbow bend fixed | Stop at a comfortable stretch | Pull the bar back over your chest
c: Arc behind the head | Fixed elbows | Stretch, then pull
m: Bending the elbows more > Keep them fixed | Arching the lower back > Keep ribs down | Going too far > Stop at the stretch
n: Light bar. Elbows slightly bent.
f: Keep it light and slow.
`;

export const ALL_TEXT = [TEXT, TEXT_PRESS, TEXT_PULL, TEXT_CORE, TEXT_KIT].join('\n');
