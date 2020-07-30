#!/usr/bin/env ruby  

class UPFlow < Shoes
	url "/", :mainscreen
		
	def mainscreen
	
		# App Menu
	
		mb = menubar
		helpmenu = menu "Help"
		@apiitem = menuitem "Set API Key" do
			window :title => "UP Flow - Set API Key", height: 140 do

				font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

				stack margin_top: 20, margin_left: 13 do
					@enter_api_key = edit_line "", :width => 570
					@enter_api_key.text = @@decrypt_api_key_final
				end

				stack margin_top: 5, margin_bottom: 5, margin_left: 12 do 
					@p_info = para ""
				end

				stack margin_left: 13 do
					flow do
						button "Save", stroke: purple, tooltip: "Save API Key" do
							Thread.new do
								@p_info.text = "Saving key, please wait..."
								@p_info.stroke = blue
								@api_key = @enter_api_key.text
								i = @api_key
								extract = 0
								newstring = ""
								while extract < i.length
									a = i[extract].ord
									b = @@crypt_final[a].to_s
									newstring = newstring + b
									extract = extract + 1
								end
								if @enter_api_key.text.include? ""
									@api_key = newstring
								end
								@p_info.text = "Using secret key and scrambling content, please wait..."
								final_shuffle =  newstring.to_i * @@crypt_final[129].to_i
								final_encrypt = final_shuffle.to_s.reverse
								File.open("assets/keys/api.txt", "w+") do |encrypt|
									encrypt.write "#{final_encrypt}"
								end
								if @enter_api_key.text() == "0"
									@p_info.text = "Error!"
									@p_info.stroke = red
									error "UP Flow - Set API Key : #{@p_info}"
								else 
									@p_info.text = "Successfully completed!!!"
									@p_info.stroke = green
									info "Encrypted and Saved API Key successfully!"
								end
							end
						end

						para "  "
						button "Copy", tooltip: "Copy content in text-box to clipboard" do 
							self.clipboard = "#{@enter_api_key.text}"
							@p_info.text = "Current content copied to clipboard!"
							@p_info.stroke = blue
						end
						para "  "
						button "Paste", tooltip: "Paste content in clipboard to text-box" do
							@enter_api_key.text = clipboard()
							@p_info.text = "Current clipboard content has been pasted!"
							@p_info.stroke = blue
						end
						para "  "
						button "Clear", tooltip: "Clear saved user API" do
							@enter_api_key.text = "0"
							File.open("assets/keys/api.txt", "w+") {|clear_api| clear_api.truncate(0)}
							if confirm "Done!\n\nPlease restart UP Flow for the changes to take effect!\n\nProceed?", title: "Task Completed"
								Shoes.quit()
							end
						end 
						para "  "
						button "Go Back", stroke: red, tooltip: "Go back to the main app window" do
							close
						end
					end
				end

			end
		end
		helpmenu << @apiitem
		@licenseitem =  menuitem "View License" do
			alert "Copyright (c) 2020 JDsnyke\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.", title: "MIT License"
		end
		helpmenu << @licenseitem
		updateseperator = menuitem "---"
		helpmenu << updateseperator
		@updateitem =  menuitem "Check for Updates", key: "control_u" do
			current_dir = Dir.pwd
			system "start #{current_dir}/updater.exe"
		end
		helpmenu << @updateitem
		@repoitem = menuitem "Visit Repo" do
			repolink = "https://www.github.com/JDsnyke/UP-Flow"
			system "start #{repolink}"
		end
		helpmenu << @repoitem
		aboutseperator = menuitem "---"
		helpmenu << aboutseperator
		@aboutitem =  menuitem "About", key: "control_i" do
			current_ver = File.read("assets/version/current.ver")
			alert "Version : #{current_ver}\n\nRuby Version : #{RUBY_VERSION}\n\nShoes Version : #{Shoes::VERSION_NUMBER} - r#{Shoes::VERSION_REVISION}\n\nAuthors : JDsnyke", title: "About"
		end
		helpmenu << @aboutitem
		mb << helpmenu
		
		require 'assets/engine'
		require 'digest'
		require 'json'

		# Body
		background "#262330"

		font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		account_json_file = IO.read("assets/data/accounts.json")
		my_accounts = JSON.parse(account_json_file)
		transaction_json_file = IO.read("assets/data/transactions.json")
		my_transactions = JSON.parse(transaction_json_file)
		sav_bal = my_accounts["data"][1..-1].sum { |bal| bal["attributes"]["balance"]["value"].to_f }

		stack :margin_top => "40", :margin_left => "20"  do
			title "$#{my_accounts["data"][0]["attributes"]["balance"]["value"]} AUD", align: "center", stroke: "#F97C68"
			para "Transactional Balance", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
			title "$#{sav_bal} AUD", align: "center", stroke: "#F97C68"
			para "Savings Balance", align: "center", stroke: "#F5F3F9"
		end

		my_accounts["data"].each do |list_s|
			stack :margin_top => "30", :margin_left => "380" do
				account_value = list_s["attributes"]["balance"]["value"]
				button "#{list_s["attributes"]["displayName"]} : $#{account_value} AUD", width:680, height: 68 do
					window :title => "UP Flow - #{list_s["attributes"]["displayName"]}" do
						
						background "#262330"

						font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

						description = []
						value = []
						date = []

						my_transactions["data"].each do |list_t|
							description << list_t["attributes"]["description"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							value << list_t["attributes"]["amount"]["value"].to_f if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							date << list_t["attributes"]["createdAt"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
						end

						stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
							title "$#{account_value} AUD", align: "center", stroke: "#F97C68"
							para "Current Balance", align: "center", stroke: "#F5F3F9"
						end
						
						date.each do |list_d|
							d = DateTime.parse("#{list_d}")
							value.each do |list_c|
								description.each do |list_b|
									stack :margin_top => "30", :margin_left => "38", :margin_right => "35" do
										background "#F5F3F9"
										para "#{list_b}", align: "center", size: "x-large", weight: "light"
										para "$ #{list_c} AUD", align: "center", size: "large"
										para "#{d.strftime('%d %b %Y at %I:%M %p')}", align: "center"
									end
								end
							end
						end
					
						stack :margin_bottom => "50" do	end

					end
				end
				stack :margin_bottom => "40" do	end
			end
		end
	end
end

Shoes.app :title => "UP Flow", width: 1400, height: 900, menus: true