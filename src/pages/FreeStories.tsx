const fallbackStories = [
    { title: "The Starry Turtle", content: "Once upon a time..." },
    { title: "Luna’s Moonlight Quest", content: "Luna the rabbit..." },
    { title: "Captain Acorn and the Jetpack Squirrel", content: "Zoom!" },
  ];
  
  export default function FreeStories() {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Free Story Library</h1>
        <p className="mb-6 text-muted-foreground">You've used your free story. Enjoy these staff picks or upgrade to unlock more!</p>
        <div className="space-y-6">
          {fallbackStories.map((s, i) => (
            <div key={i} className="border p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
              <p>{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  