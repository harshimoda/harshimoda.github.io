//
//  DracoWrapper.cpp
//  ScannerPlugin
//
//  Created by Siddesh M on 25/02/26.
//
#include "draco/compression/encode.h"
#include "draco/core/cycle_timer.h"
#include "draco/io/mesh_io.h"
#include "draco/io/point_cloud_io.h"

// Basic wrapper to compress a mesh file
bool compressMeshFile(const std::string &input_path, const std::string &output_path, int quantization_bits) {
    auto mesh_res = draco::ReadMeshFromFile(input_path);
    if (!mesh_res.ok()) return false;
    
    std::unique_ptr<draco::Mesh> mesh = std::move(mesh_res).value();
    draco::Encoder encoder;
    
    // Set quantization (Task D Requirement)
    // Default is 11, higher means more compression but less precision
    encoder.SetAttributeQuantization(draco::GeometryAttribute::POSITION, quantization_bits);
    encoder.SetSpeedOptions(7, 7); // Default recommended speed/compression balance
    
    draco::EncoderBuffer buffer;
    const draco::Status status = encoder.EncodeMeshToBuffer(*mesh, &buffer);
    
    if (!status.ok()) return false;
    
    // Write compressed buffer to file
    std::ofstream out(output_path, std::ios::binary);
    out.write(reinterpret_cast<const char*>(buffer.data()), buffer.size());
    return true;
}
