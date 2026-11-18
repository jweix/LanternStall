(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DapaidangLevelConfig = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Each orders entry is one dish; the three arrays are exact table replacement queues.
  // Recipe ids and ingredients: recipes.json. Edit orders, shape, layers or difficulty, then run levels:generate and npm test.
  const limits = {"maxDishes":24,"maxRecipes":6,"maxIngredients":72,"maxLayers":5,"maxIngredientRatio":0.2,"maxOpeningRatio":0.3,"rescueAdsPerRun":2};
  const profiles = [{"id":"easy","name":"入门","prepLimit":3,"mixing":0},{"id":"normal","name":"家常","prepLimit":4,"mixing":1},{"id":"hard","name":"忙碌","prepLimit":6,"mixing":2},{"id":"expert","name":"挑战","prepLimit":7,"mixing":3}];
  const levels = [
    {"level":1,"difficulty":"easy","shape":"pairs","layers":1,"seed":7919,"orders":[["d01","d01"],["d02"],["d04"]]},
    {"level":2,"difficulty":"easy","shape":"islands","layers":2,"seed":15838,"orders":[["d01","d01"],["d02","d02"],["d14"]]},
    {"level":3,"difficulty":"easy","shape":"bridge","layers":2,"seed":23757,"orders":[["d03","d03"],["d05","d05"],["d18","d18"]]},
    {"level":4,"difficulty":"normal","shape":"lantern","layers":2,"seed":349195678,"orders":[["d01","d14","d01"],["d02","d02"],["d11","d11"]]},
    {"level":5,"difficulty":"normal","shape":"ring","layers":2,"seed":1702130114,"orders":[["d06","d14","d06","d14"],["d07","d07"],["d11","d11"]]},
    {"level":6,"difficulty":"normal","shape":"twins","layers":2,"seed":3458735055,"orders":[["d06","d06","d06"],["d07","d14","d07","d14"],["d11","d11"]]},
    {"level":7,"difficulty":"normal","shape":"bridge","layers":3,"seed":2422882561,"orders":[["d01","d01","d01"],["d05","d14","d05","d14"],["d13","d13","d13"]]},
    {"level":8,"difficulty":"normal","shape":"ring","layers":3,"seed":2585383156,"orders":[["d03","d03","d03"],["d07","d19","d07","d19"],["d17","d17","d17"]]},
    {"level":9,"difficulty":"normal","shape":"lantern","layers":3,"seed":634090615,"orders":[["d01","d14","d01","d14","d01"],["d05","d05","d05"],["d11","d11","d11"]]},
    {"level":10,"difficulty":"hard","shape":"twins","layers":3,"seed":1747120551,"orders":[["d06","d20","d06","d20","d06","d20"],["d08","d08","d08"],["d12","d12","d12"]]},
    {"level":11,"difficulty":"normal","shape":"bridge","layers":3,"seed":3416816416,"orders":[["d09","d19","d09","d19","d09"],["d02","d11","d02","d11","d02"],["d14","d14","d14"]]},
    {"level":12,"difficulty":"normal","shape":"ring","layers":3,"seed":4246098222,"orders":[["d01","d12","d01","d12","d01"],["d10","d14","d10","d14","d10"],["d13","d13","d13"]]},
    {"level":13,"difficulty":"normal","shape":"lantern","layers":3,"seed":3753709815,"orders":[["d02","d11","d02","d11","d02"],["d05","d15","d05","d15","d05"],["d14","d14","d14"]]},
    {"level":14,"difficulty":"normal","shape":"twins","layers":3,"seed":2741246967,"orders":[["d01","d16","d01","d16","d01","d16"],["d08","d14","d08","d14","d08"],["d13","d13","d13"]]},
    {"level":15,"difficulty":"hard","shape":"bridge","layers":3,"seed":2470290268,"orders":[["d08","d13","d08","d13","d08","d13"],["d03","d14","d03","d14","d03"],["d18","d18","d18"]]},
    {"level":16,"difficulty":"normal","shape":"ring","layers":3,"seed":2866594461,"orders":[["d03","d19","d03","d19","d03","d19"],["d01","d14","d01","d14","d01"],["d13","d13","d13"]]},
    {"level":17,"difficulty":"normal","shape":"lantern","layers":3,"seed":237876287,"orders":[["d05","d20","d05","d20","d05","d20"],["d01","d11","d01","d11","d01","d11"],["d18","d18","d18"]]},
    {"level":18,"difficulty":"normal","shape":"twins","layers":3,"seed":1491461980,"orders":[["d08","d13","d08","d13","d08","d13"],["d03","d15","d03","d15","d03","d15"],["d14","d14","d14"]]},
    {"level":19,"difficulty":"normal","shape":"bridge","layers":3,"seed":3443705298,"orders":[["d04","d17","d04","d17","d04","d17"],["d08","d16","d08","d16","d08","d16"],["d13","d13","d13"]]},
    {"level":20,"difficulty":"hard","shape":"ring","layers":3,"seed":3789544348,"orders":[["d03","d13","d03","d13","d03","d13"],["d01","d14","d01","d14","d01","d14"],["d19","d19","d19","d19"]]},
    {"level":21,"difficulty":"normal","shape":"lantern","layers":4,"seed":1139401132,"orders":[["d01","d14","d01","d14","d01","d01","d01","d01"],["d11","d19","d11","d19","d11"],["d16","d13","d16","d13"]]},
    {"level":22,"difficulty":"hard","shape":"twins","layers":4,"seed":3849229960,"orders":[["d01","d19","d01","d19","d01","d01","d01","d01"],["d14","d12","d14","d12","d14"],["d13","d16","d13","d16"]]},
    {"level":23,"difficulty":"hard","shape":"bridge","layers":4,"seed":2833299067,"orders":[["d04","d13","d04","d13","d04","d04","d04","d04"],["d19","d17","d19","d17","d19"],["d15","d16","d15","d16"]]},
    {"level":24,"difficulty":"hard","shape":"ring","layers":4,"seed":1563711378,"orders":[["d01","d19","d01","d19","d01","d01","d01","d01"],["d14","d13","d14","d13","d14"],["d11","d16","d11","d16"]]},
    {"level":25,"difficulty":"expert","shape":"lantern","layers":4,"seed":2133385135,"orders":[["d08","d16","d08","d16","d08","d08","d08","d08"],["d15","d13","d15","d13","d15"],["d14","d20","d14","d20"]]},
    {"level":26,"difficulty":"normal","shape":"twins","layers":4,"seed":3848350854,"orders":[["d01","d12","d01","d12","d01","d01","d01","d01"],["d13","d19","d13","d19","d13"],["d16","d14","d16","d14"]]},
    {"level":27,"difficulty":"hard","shape":"bridge","layers":4,"seed":1164955139,"orders":[["d01","d16","d01","d16","d01","d01","d01","d01"],["d14","d19","d14","d19","d14"],["d13","d12","d13","d12"]]},
    {"level":28,"difficulty":"hard","shape":"ring","layers":4,"seed":4149412706,"orders":[["d08","d13","d08","d13","d08","d08","d08","d08"],["d14","d20","d14","d20","d14"],["d15","d16","d15","d16","d15"]]},
    {"level":29,"difficulty":"hard","shape":"lantern","layers":4,"seed":3997563521,"orders":[["d01","d20","d01","d20","d01","d01","d01","d01"],["d14","d19","d14","d19","d14"],["d13","d16","d13","d16","d13"]]},
    {"level":30,"difficulty":"expert","shape":"twins","layers":4,"seed":1296189666,"orders":[["d01","d12","d01","d12","d01","d01","d01","d01"],["d16","d19","d16","d19","d16"],["d14","d13","d14","d13","d14"]]},
    {"level":31,"difficulty":"normal","shape":"bridge","layers":4,"seed":1527410080,"orders":[["d01","d12","d01","d12","d01","d01","d01","d01"],["d13","d19","d13","d19","d13"],["d16","d14","d16","d14","d16"]]},
    {"level":32,"difficulty":"hard","shape":"ring","layers":4,"seed":949844797,"orders":[["d04","d19","d04","d19","d04","d04","d04","d04"],["d13","d16","d13","d16","d13"],["d15","d12","d15","d12","d15"]]},
    {"level":33,"difficulty":"hard","shape":"lantern","layers":4,"seed":2098284137,"orders":[["d08","d13","d08","d13","d08","d08","d08","d08"],["d14","d15","d14","d15","d14"],["d18","d16","d18","d16","d18"]]},
    {"level":34,"difficulty":"hard","shape":"twins","layers":4,"seed":4028619978,"orders":[["d04","d12","d04","d12","d04","d04","d04","d04"],["d19","d16","d19","d16","d19","d16"],["d13","d15","d13","d15","d13"]]},
    {"level":35,"difficulty":"expert","shape":"bridge","layers":4,"seed":707460500,"orders":[["d04","d19","d04","d19","d04","d04","d04","d04"],["d16","d13","d16","d13","d16","d13"],["d15","d12","d15","d12","d15"]]},
    {"level":36,"difficulty":"normal","shape":"ring","layers":4,"seed":964862099,"orders":[["d01","d14","d01","d14","d01","d01","d01","d01"],["d19","d16","d19","d16","d19","d16"],["d13","d12","d13","d12","d13"]]},
    {"level":37,"difficulty":"hard","shape":"lantern","layers":4,"seed":2827972016,"orders":[["d01","d14","d01","d14","d01","d01","d01","d01"],["d13","d19","d13","d19","d13","d19"],["d16","d20","d16","d20","d16"]]},
    {"level":38,"difficulty":"hard","shape":"twins","layers":4,"seed":2796154015,"orders":[["d01","d12","d01","d12","d01","d01","d01","d01"],["d19","d14","d19","d14","d19","d14"],["d11","d13","d11","d13","d11"]]},
    {"level":39,"difficulty":"hard","shape":"bridge","layers":4,"seed":308841,"orders":[["d08","d17","d08","d17","d08","d08","d08","d08"],["d16","d14","d16","d14","d16","d14"],["d15","d13","d15","d13","d15"]]},
    {"level":40,"difficulty":"expert","shape":"ring","layers":4,"seed":3681279018,"orders":[["d08","d16","d08","d16","d08","d08","d08","d08"],["d15","d14","d15","d14","d15","d14"],["d20","d13","d20","d13","d20","d13"]]},
    {"level":41,"difficulty":"hard","shape":"lantern","layers":4,"seed":3213249445,"orders":[["d03","d14","d03","d14","d03","d14","d03","d03","d03"],["d19","d15","d19","d15","d19","d15"],["d13","d12","d13","d12","d13","d12"]]},
    {"level":42,"difficulty":"expert","shape":"twins","layers":5,"seed":1411732632,"orders":[["d04","d13","d04","d13","d04","d13","d04","d04","d04"],["d19","d17","d19","d17","d19","d17"],["d15","d16","d15","d16","d15","d16"]]},
    {"level":43,"difficulty":"expert","shape":"bridge","layers":5,"seed":439863183,"orders":[["d03","d15","d03","d15","d03","d15","d03","d03","d03"],["d18","d13","d18","d13","d18","d13"],["d19","d14","d19","d14","d19","d14"]]},
    {"level":44,"difficulty":"expert","shape":"ring","layers":5,"seed":1568646804,"orders":[["d03","d13","d03","d13","d03","d13","d03","d03","d03"],["d19","d14","d19","d14","d19","d14"],["d15","d18","d15","d18","d15","d18"]]},
    {"level":45,"difficulty":"expert","shape":"lantern","layers":5,"seed":1911849767,"orders":[["d01","d13","d01","d13","d01","d13","d01","d01","d01"],["d14","d11","d14","d11","d14","d11"],["d12","d19","d12","d19","d12","d19"]]},
    {"level":46,"difficulty":"hard","shape":"lantern","layers":4,"seed":2081605894,"orders":[["d01","d19","d01","d19","d01","d19","d01","d01","d01"],["d12","d14","d12","d14","d12","d14"],["d13","d11","d13","d11","d13","d11"]]},
    {"level":47,"difficulty":"expert","shape":"bridge","layers":5,"seed":2183122391,"orders":[["d01","d19","d01","d19","d01","d19","d01","d01","d01"],["d12","d16","d12","d16","d12","d16"],["d14","d13","d14","d13","d14","d13"]]},
    {"level":48,"difficulty":"expert","shape":"ring","layers":5,"seed":3032723774,"orders":[["d04","d15","d04","d15","d04","d15","d04","d04","d04"],["d16","d13","d16","d13","d16","d13","d16"],["d17","d19","d17","d19","d17","d19"]]},
    {"level":49,"difficulty":"expert","shape":"lantern","layers":5,"seed":3710340856,"orders":[["d01","d14","d01","d14","d01","d14","d01","d01","d01"],["d13","d11","d13","d11","d13","d11","d13"],["d19","d12","d19","d12","d19","d12"]]},
    {"level":50,"difficulty":"expert","shape":"twins","layers":5,"seed":2047797798,"orders":[["d04","d13","d04","d13","d04","d13","d04","d04","d04"],["d16","d15","d16","d15","d16","d15","d16"],["d17","d19","d17","d19","d17","d19"]]},
    {"level":51,"difficulty":"hard","shape":"lantern","layers":4,"seed":4138602110,"orders":[["d01","d16","d01","d16","d01","d16","d01","d01","d01"],["d14","d19","d14","d19","d14","d19","d14"],["d11","d13","d11","d13","d11","d13"]]},
    {"level":52,"difficulty":"expert","shape":"ring","layers":5,"seed":3278800630,"orders":[["d04","d15","d04","d15","d04","d15","d04","d04","d04"],["d13","d16","d13","d16","d13","d16","d13"],["d12","d19","d12","d19","d12","d19"]]},
    {"level":53,"difficulty":"expert","shape":"lantern","layers":5,"seed":95717559,"orders":[["d03","d15","d03","d15","d03","d15","d03","d03","d03"],["d13","d19","d13","d19","d13","d19","d13"],["d18","d14","d18","d14","d18","d14"]]},
    {"level":54,"difficulty":"expert","shape":"twins","layers":5,"seed":2860754858,"orders":[["d04","d11","d04","d11","d04","d11","d04","d04","d04"],["d15","d13","d15","d13","d15","d13","d15"],["d16","d12","d16","d12","d16","d12","d16"]]},
    {"level":55,"difficulty":"expert","shape":"bridge","layers":5,"seed":2656918164,"orders":[["d04","d11","d04","d11","d04","d11","d04","d04","d04"],["d15","d12","d15","d12","d15","d12","d15"],["d13","d16","d13","d16","d13","d16","d13"]]},
    {"level":56,"difficulty":"hard","shape":"lantern","layers":4,"seed":348826091,"orders":[["d01","d12","d01","d12","d01","d12","d01","d01","d01"],["d19","d14","d19","d14","d19","d14","d19"],["d13","d16","d13","d16","d13","d16","d13"]]},
    {"level":57,"difficulty":"expert","shape":"lantern","layers":5,"seed":4251138319,"orders":[["d01","d11","d01","d11","d01","d11","d01","d01","d01"],["d13","d16","d13","d16","d13","d16","d13"],["d14","d19","d14","d19","d14","d19","d14"]]},
    {"level":58,"difficulty":"expert","shape":"twins","layers":5,"seed":2724241995,"orders":[["d01","d19","d01","d19","d01","d19","d01","d01","d01"],["d14","d11","d14","d11","d14","d11","d14"],["d13","d16","d13","d16","d13","d16","d13"]]},
    {"level":59,"difficulty":"expert","shape":"bridge","layers":5,"seed":859370244,"orders":[["d04","d13","d04","d13","d04","d13","d04","d04","d04"],["d16","d17","d16","d17","d16","d17","d16"],["d15","d19","d15","d19","d15","d19","d15"]]},
    {"level":60,"difficulty":"expert","shape":"ring","layers":5,"seed":3552777282,"orders":[["d04","d11","d04","d11","d04","d11","d04","d11","d04","d04"],["d15","d12","d15","d12","d15","d12","d15"],["d13","d19","d13","d19","d13","d19","d13"]]},
  ];
  // After the authored levels, cycle these capped plans; selected seeds remain individually editable.
  const repeat = [
    {"difficulty":"hard","shape":"lantern","layers":4,"orders":[["d04","d12","d04","d12","d04","d12","d04","d12","d04","d04"],["d13","d15","d13","d15","d13","d15","d13"],["d11","d19","d11","d19","d11","d19","d11"]]},
    {"difficulty":"expert","shape":"ring","layers":5,"orders":[["d04","d11","d04","d11","d04","d11","d04","d11"],["d13","d16","d13","d16","d13","d16","d13","d16"],["d15","d12","d15","d12","d15","d12","d15","d12"]]},
    {"difficulty":"expert","shape":"lantern","layers":5,"orders":[["d02","d16","d02","d16","d16","d16"],["d14","d19","d14","d19","d14","d19","d14","d19","d14"],["d13","d15","d13","d15","d13","d15","d13","d15","d13"]]},
    {"difficulty":"expert","shape":"twins","layers":5,"orders":[["d18","d13","d18","d13","d18","d13","d18","d13"],["d19","d15","d19","d15","d19","d15","d19","d15"],["d14","d11","d14","d11","d14","d11","d14","d11"]]},
    {"difficulty":"expert","shape":"lantern","layers":5,"orders":[["d03","d15","d03","d15","d03","d15","d03","d15","d03","d03"],["d13","d19","d13","d19","d13","d19","d13"],["d14","d12","d14","d12","d14","d12","d14"]]},
  ];
  const seeds = {"61":4148912348,"62":4169341167,"63":3182512657,"64":4093237290,"65":2821362610,"66":1852059450,"67":2279078869,"68":1191504511,"69":4137903738,"70":216320475,"71":2912812853,"72":2505579730,"73":578087,"74":293433062,"75":4211106293,"76":1089453539,"77":37616426,"78":3070094615,"79":911344964,"80":3317727389,"81":2916115730,"82":904991039,"83":3688356464,"84":2727456935,"85":412243978,"86":4045935261,"87":4137226806,"88":1241912216,"89":3393630804,"90":1316066765,"91":1852059450,"92":1757117456,"93":494000701,"94":2784533329,"95":4037122519,"96":4045935261,"97":2544408739,"98":2664856944,"99":1990749287,"100":4085680154};
  return { version: 3, limits, profiles, levels, repeat, seeds };
});
