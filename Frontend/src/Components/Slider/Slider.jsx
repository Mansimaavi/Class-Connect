import Carousel from "react-bootstrap/Carousel";

function Slider() {
  return (
    <div className="mt-16 mb-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl ">
        <Carousel data-bs-theme="dark">
          <Carousel.Item>
            <img
              className="d-block w-full object-cover h-96"
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2sou0G04hG38uHaLs3yYLoFVPSJhsqeshYnvfgOkZkqV2DdPFkbXaaSCCxNhpkD58GKE&usqp=CAU"
              alt="First slide"
            />
            <Carousel.Caption className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              {/* <h5 className="text-white text-lg font-bold">First Slide Label</h5> */}
             
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-full object-cover h-96"
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh4hBKE0f-2mn6McdZa8kcqWerz7Nc4RiOFbXFbgVs_9vni9ko9ajMoeLWm4Lntzw4EbU&usqp=CAU"
              alt="Second slide"
            />
            <Carousel.Caption className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              {/* <h5 className="text-white text-lg font-bold">Second Slide Label</h5> */}
              
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-full object-cover h-96"
              src="https://cdn.pixabay.com/photo/2018/01/23/07/49/education-3100862_1280.jpg"
              alt="Third slide"
            />
            <Carousel.Caption className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              {/* <h5 className="text-white text-lg font-bold">Third Slide Label</h5> */}
             
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </div>
    </div>
  );
}

export default Slider;
