const HandleSeeMore = (setter, value) => {
    setter(!value);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  export default HandleSeeMore