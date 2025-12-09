const OrderSubjects = (tab) => {
  const genreWithColors = [
    { name: "Fantasy", color: "#8E44AD" }, // violet magique
    { name: "Science fiction", color: "#27AE60" }, // vert futuriste
    { name: "Fiction", color: "#7D3C98" }, // violet doux
    { name: "Romance", color: "#D68910" }, // marron chaud
    { name: "Young adult", color: "#A04000" }, // brun orangé
    { name: "Young adult fiction", color: "#935116" },
    { name: "Adventure", color: "#6E2C00" },
    { name: "Action", color: "#873600" },
    { name: "Thriller", color: "#4B2E83" }, // violet sombre
    { name: "Mystery", color: "#6C3483" },
    { name: "Crime", color: "#512E5F" },
    { name: "Detective", color: "#2E4053" }, // bleu très foncé / neutre
    { name: "Horror", color: "#4D0000" },
    { name: "Drama", color: "#784212" },
    { name: "Poetry", color: "#7D3C98" },
    { name: "Short stories", color: "#A04000" },
    { name: "Historical fiction", color: "#935116" },
    { name: "History", color: "#6E2C00" },
    { name: "Biography", color: "#2E4053" },
    { name: "Autobiography", color: "#2E4053" },
    { name: "Memoir", color: "#512E5F" },
    { name: "Non-fiction", color: "#1E8449" }, // vert naturel
    { name: "Classic literature", color: "#7D6608" },
    { name: "Children's literature", color: "#784212" },
    { name: "Middle grade", color: "#935116" },
    { name: "Self-help", color: "#196F3D" },
    { name: "Psychology", color: "#2874A6" }, // bleu violet
    { name: "Philosophy", color: "#6C3483" },
    { name: "Spirituality", color: "#7D3C98" },
    { name: "Religion", color: "#4B2E83" },
    { name: "Mythology", color: "#8E44AD" },
    { name: "Magic", color: "#8E44AD" },
    { name: "Supernatural", color: "#6C3483" },
    { name: "Dystopia", color: "#512E5F" },
    { name: "Utopia", color: "#196F3D" },
    { name: "Post-apocalyptic", color: "#4B2E83" },
    { name: "War", color: "#873600" },
    { name: "Politics", color: "#512E5F" },
    { name: "Social issues", color: "#2E4053" },
    { name: "LGBTQ+", color: "#7D3C98" },
    { name: "Friendship", color: "#935116" },
    { name: "Family", color: "#784212" },
    { name: "Relationships", color: "#D68910" },
    { name: "Coming of age", color: "#A04000" },
    { name: "Education", color: "#2874A6" },
    { name: "Science", color: "#196F3D" },
    { name: "Technology", color: "#1E8449" },
    { name: "Artificial intelligence", color: "#2E4053" },
    { name: "Space", color: "#512E5F" },
    { name: "Time travel", color: "#6C3483" },
    { name: "Environment", color: "#196F3D" },
    { name: "Nature", color: "#1E8449" },
    { name: "Animals", color: "#2E4053" },
    { name: "Sports", color: "#873600" },
    { name: "Travel", color: "#784212" },
    { name: "Art", color: "#7D3C98" },
    { name: "Music", color: "#6C3483" },
    { name: "Culture", color: "#2874A6" },
    { name: "Humor", color: "#935116" },
    { name: "Satire", color: "#512E5F" },
    { name: "Cooking", color: "#784212" },
    { name: "Health", color: "#196F3D" },
    { name: "Medicine", color: "#1E8449" },
    { name: "Economics", color: "#512E5F" },
    { name: "Business", color: "#2874A6" },
  ];

  let result = [];

  for (let i = 0; i < tab.length; i++) {
    const index = genreWithColors.findIndex((item) => item.name === tab[i]);
    if (index !== -1) {
      //Si on a le theme dans notre liste de thème
      result.push(genreWithColors[index]);
    }
  }
  return result; //retourne un tableau avec les différents thèmes avec leur couleur associée
};

export default OrderSubjects;
