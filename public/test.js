// Exemple de nettoyage JSON
fetch("communes-france.json")
  .then(res => res.json())
  .then(data => {
    const simplifie = data.map(item => ({
      code_postal: item.code_postal,
      nom_commune: item.nom_commune
    }));
    console.log(JSON.stringify(simplifie));
  });
